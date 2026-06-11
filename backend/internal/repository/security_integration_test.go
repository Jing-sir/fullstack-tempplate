package repository_test

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"sync"
	"testing"
	"time"

	"auth-service/internal/config"
	"auth-service/internal/model"
	"auth-service/internal/repository"

	"github.com/redis/go-redis/v9"
)

func integrationConfig(t *testing.T) config.Config {
	t.Helper()
	if os.Getenv("RUN_INTEGRATION_TESTS") != "1" {
		t.Skip("设置 RUN_INTEGRATION_TESTS=1 后运行 PostgreSQL/Redis 集成测试")
	}
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config.Load() error = %v", err)
	}
	return cfg
}

func TestMenuRepositoryHonorsAncestorStatusAndPreventsConcurrentCycle(t *testing.T) {
	cfg := integrationConfig(t)
	ctx := context.Background()
	db, err := config.OpenDB(ctx, cfg.DatabaseDSN)
	if err != nil {
		t.Fatalf("OpenDB() error = %v", err)
	}
	defer db.Close()

	suffix := fmt.Sprintf("it-%d", time.Now().UnixNano())
	rootName := suffix + "-root"
	pageName := suffix + "-page"
	buttonName := suffix + "-button"
	firstName := suffix + "-first"
	secondName := suffix + "-second"
	roleName := suffix + "-role"
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, "DELETE FROM roles WHERE name=$1", roleName)
		_, _ = db.ExecContext(ctx, `
			DELETE FROM menus
			WHERE name IN ($1, $2, $3, $4, $5)
		`, rootName, pageName, buttonName, firstName, secondName)
	})

	insertMenu := func(parentID int64, name string, menuType model.MenuType) int64 {
		t.Helper()
		var id int64
		if err := db.QueryRowContext(ctx, `
			INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
			VALUES ($1, $2, $2, $3, '', 10, 1)
			RETURNING id
		`, parentID, name, menuType).Scan(&id); err != nil {
			t.Fatalf("insert menu %s: %v", name, err)
		}
		return id
	}

	rootID := insertMenu(0, rootName, model.MenuTypeDir)
	pageID := insertMenu(rootID, pageName, model.MenuTypePage)
	buttonID := insertMenu(pageID, buttonName, model.MenuTypeButton)
	firstID := insertMenu(0, firstName, model.MenuTypeDir)
	secondID := insertMenu(0, secondName, model.MenuTypeDir)

	var roleID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO roles (name, title, description, status)
		VALUES ($1, $1, '', 1)
		RETURNING id
	`, roleName).Scan(&roleID); err != nil {
		t.Fatalf("insert role: %v", err)
	}
	if _, err := db.ExecContext(ctx,
		"INSERT INTO role_menus (role_id, menu_id) VALUES ($1, $2)",
		roleID, buttonID,
	); err != nil {
		t.Fatalf("grant button: %v", err)
	}

	repo := repository.NewMenuRepository(db)
	menus, err := repo.GetByRoleIDs(ctx, []int64{roleID})
	if err != nil {
		t.Fatalf("GetByRoleIDs() error = %v", err)
	}
	if len(menus) != 1 || menus[0].ID != buttonID {
		t.Fatalf("enabled menus = %#v, want button %d", menus, buttonID)
	}
	if _, err := db.ExecContext(ctx, "UPDATE menus SET status=0 WHERE id=$1", rootID); err != nil {
		t.Fatalf("disable root: %v", err)
	}
	menus, err = repo.GetByRoleIDs(ctx, []int64{roleID})
	if err != nil {
		t.Fatalf("GetByRoleIDs() after disable error = %v", err)
	}
	if len(menus) != 0 {
		t.Fatalf("menus after disabled ancestor = %#v, want empty", menus)
	}

	errs := make(chan error, 2)
	var start sync.WaitGroup
	start.Add(1)
	for _, move := range []struct {
		id       int64
		parentID int64
	}{
		{id: firstID, parentID: secondID},
		{id: secondID, parentID: firstID},
	} {
		go func() {
			start.Wait()
			errs <- repo.MoveWithVersionBump(ctx, move.id, move.parentID, 10)
		}()
	}
	start.Done()

	successes := 0
	cycles := 0
	for range 2 {
		moveErr := <-errs
		switch {
		case moveErr == nil:
			successes++
		case errors.Is(moveErr, repository.ErrMenuCycle):
			cycles++
		default:
			t.Fatalf("unexpected move error: %v", moveErr)
		}
	}
	if successes != 1 || cycles != 1 {
		t.Fatalf("concurrent moves successes=%d cycles=%d, want 1/1", successes, cycles)
	}

	var firstParent, secondParent int64
	if err := db.QueryRowContext(ctx,
		"SELECT parent_id FROM menus WHERE id=$1",
		firstID,
	).Scan(&firstParent); err != nil {
		t.Fatalf("query first parent: %v", err)
	}
	if err := db.QueryRowContext(ctx,
		"SELECT parent_id FROM menus WHERE id=$1",
		secondID,
	).Scan(&secondParent); err != nil {
		t.Fatalf("query second parent: %v", err)
	}
	if firstParent == secondID && secondParent == firstID {
		t.Fatal("concurrent moves created a two-node cycle")
	}
}

func TestRoleAndAdminUserCompositeMutationsRollback(t *testing.T) {
	cfg := integrationConfig(t)
	ctx := context.Background()
	db, err := config.OpenDB(ctx, cfg.DatabaseDSN)
	if err != nil {
		t.Fatalf("OpenDB() error = %v", err)
	}
	defer db.Close()

	suffix := fmt.Sprintf("it-%d", time.Now().UnixNano())
	menuName := suffix + "-menu"
	createRoleName := suffix + "-create-role"
	updateRoleName := suffix + "-update-role"
	createUserName := suffix + "-create-user"
	updateUserName := suffix + "-update-user"
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, "DELETE FROM admin_users WHERE username IN ($1, $2)", createUserName, updateUserName)
		_, _ = db.ExecContext(ctx, "DELETE FROM roles WHERE name IN ($1, $2)", createRoleName, updateRoleName)
		_, _ = db.ExecContext(ctx, "DELETE FROM menus WHERE name=$1", menuName)
	})

	var menuID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
		VALUES (0, $1, $1, 1, '', 10, 1)
		RETURNING id
	`, menuName).Scan(&menuID); err != nil {
		t.Fatalf("insert menu: %v", err)
	}

	const missingID int64 = 9_223_372_036_854_775_000
	roleRepo := repository.NewRoleRepository(db)
	if _, err := roleRepo.CreateWithMenus(ctx, model.Role{
		Name: createRoleName, Title: createRoleName, Status: 1,
	}, []int64{missingID}); err == nil {
		t.Fatal("CreateWithMenus() error = nil, want foreign key failure")
	}
	var count int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM roles WHERE name=$1", createRoleName).Scan(&count); err != nil {
		t.Fatalf("count created role: %v", err)
	}
	if count != 0 {
		t.Fatalf("created role count = %d, want 0 after rollback", count)
	}

	var updateRoleID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO roles (name, title, description, status)
		VALUES ($1, 'old-title', '', 1)
		RETURNING id
	`, updateRoleName).Scan(&updateRoleID); err != nil {
		t.Fatalf("insert update role: %v", err)
	}
	if _, err := db.ExecContext(ctx,
		"INSERT INTO role_menus (role_id, menu_id) VALUES ($1, $2)",
		updateRoleID, menuID,
	); err != nil {
		t.Fatalf("grant update role: %v", err)
	}
	if err := roleRepo.UpdateWithMenus(ctx, model.Role{
		ID: updateRoleID, Name: updateRoleName, Title: "new-title", Status: 1,
	}, []int64{missingID}); err == nil {
		t.Fatal("UpdateWithMenus() error = nil, want foreign key failure")
	}
	var title string
	if err := db.QueryRowContext(ctx, "SELECT title FROM roles WHERE id=$1", updateRoleID).Scan(&title); err != nil {
		t.Fatalf("query role title: %v", err)
	}
	if title != "old-title" {
		t.Fatalf("role title = %q, want old-title after rollback", title)
	}
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM role_menus WHERE role_id=$1", updateRoleID).Scan(&count); err != nil {
		t.Fatalf("count role menus: %v", err)
	}
	if count != 1 {
		t.Fatalf("role menu count = %d, want 1 after rollback", count)
	}

	userRepo := repository.NewAdminUserRepository(db)
	if err := userRepo.CreateWithRole(ctx, model.AdminUser{
		UID: suffix + "-create-uid", Username: createUserName, RealName: "Create", Password: "hash", Status: 1,
	}, missingID); err == nil {
		t.Fatal("CreateWithRole() error = nil, want foreign key failure")
	}
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM admin_users WHERE username=$1", createUserName).Scan(&count); err != nil {
		t.Fatalf("count created user: %v", err)
	}
	if count != 0 {
		t.Fatalf("created user count = %d, want 0 after rollback", count)
	}

	var updateUserID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO admin_users (uid, username, real_name, password, status)
		VALUES ($1, $2, 'old-name', 'hash', 1)
		RETURNING id
	`, suffix+"-update-uid", updateUserName).Scan(&updateUserID); err != nil {
		t.Fatalf("insert update user: %v", err)
	}
	if err := userRepo.UpdateWithRole(ctx, model.AdminUser{
		ID: updateUserID, UID: suffix + "-update-uid", Username: updateUserName,
		RealName: "new-name", Password: "hash", Status: 1,
	}, &[]int64{missingID}[0]); err == nil {
		t.Fatal("UpdateWithRole() error = nil, want missing role failure")
	}
	var realName string
	if err := db.QueryRowContext(ctx, "SELECT real_name FROM admin_users WHERE id=$1", updateUserID).Scan(&realName); err != nil {
		t.Fatalf("query user real name: %v", err)
	}
	if realName != "old-name" {
		t.Fatalf("user real name = %q, want old-name after rollback", realName)
	}
}

func TestTwoFARepositoryChallengeReplayAndRateLimit(t *testing.T) {
	cfg := integrationConfig(t)
	ctx := context.Background()
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})
	if err := client.Ping(ctx).Err(); err != nil {
		t.Fatalf("redis ping: %v", err)
	}
	defer client.Close()

	repo := repository.NewTwoFARepository(client, cfg.AppEnv)
	userID := time.Now().UnixNano()
	counter := time.Now().Unix() / 30
	firstChallenge := fmt.Sprintf("it-%d-first", userID)
	secondChallenge := fmt.Sprintf("it-%d-second", userID)
	mismatchChallenge := fmt.Sprintf("it-%d-mismatch", userID)
	prefix := "auth-service:" + cfg.AppEnv + ":"
	t.Cleanup(func() {
		_ = client.Del(
			ctx,
			prefix+"security:2fa:challenge:"+firstChallenge,
			prefix+"security:2fa:challenge:"+secondChallenge,
			prefix+"security:2fa:challenge:"+mismatchChallenge,
			fmt.Sprintf("%ssecurity:2fa:used:%d:%d", prefix, userID, counter),
			fmt.Sprintf("%ssecurity:2fa:failures:%d", prefix, userID),
		).Err()
	})

	if err := repo.SaveChallenge(ctx, firstChallenge, userID, "permission.menu.delete", "menu:1", time.Minute); err != nil {
		t.Fatalf("SaveChallenge() error = %v", err)
	}
	if err := repo.SaveChallenge(ctx, secondChallenge, userID, "permission.menu.delete", "menu:2", time.Minute); err != nil {
		t.Fatalf("SaveChallenge() second error = %v", err)
	}

	replayErrors := make(chan error, 2)
	var replayStart sync.WaitGroup
	replayStart.Add(1)
	for _, challenge := range []struct {
		id     string
		target string
	}{
		{id: firstChallenge, target: "menu:1"},
		{id: secondChallenge, target: "menu:2"},
	} {
		go func() {
			replayStart.Wait()
			replayErrors <- repo.ConsumeChallenge(
				ctx,
				challenge.id,
				userID,
				"permission.menu.delete",
				challenge.target,
				counter,
				time.Minute,
			)
		}()
	}
	replayStart.Done()

	replaySuccesses := 0
	replayRejected := 0
	for range 2 {
		consumeErr := <-replayErrors
		switch {
		case consumeErr == nil:
			replaySuccesses++
		case errors.Is(consumeErr, repository.ErrTwoFAReplay):
			replayRejected++
		default:
			t.Fatalf("unexpected concurrent challenge error: %v", consumeErr)
		}
	}
	if replaySuccesses != 1 || replayRejected != 1 {
		t.Fatalf(
			"concurrent challenge successes=%d replays=%d, want 1/1",
			replaySuccesses,
			replayRejected,
		)
	}

	if err := repo.SaveChallenge(ctx, mismatchChallenge, userID, "permission.menu.move", "menu:3", time.Minute); err != nil {
		t.Fatalf("SaveChallenge() mismatch error = %v", err)
	}
	if err := repo.ConsumeChallenge(
		ctx, mismatchChallenge, userID, "permission.menu.delete", "menu:3", counter+1, time.Minute,
	); !errors.Is(err, repository.ErrTwoFAChallengeInvalid) {
		t.Fatalf("ConsumeChallenge() mismatch error = %v, want ErrTwoFAChallengeInvalid", err)
	}

	for range 5 {
		if _, err := repo.RecordFailure(ctx, userID, time.Minute); err != nil {
			t.Fatalf("RecordFailure() error = %v", err)
		}
	}
	blocked, err := repo.IsBlocked(ctx, userID, 5)
	if err != nil {
		t.Fatalf("IsBlocked() error = %v", err)
	}
	if !blocked {
		t.Fatal("IsBlocked() = false, want true after five failures")
	}
}

func TestAdminUserRepositoryProtectsLastSuperadmin(t *testing.T) {
	cfg := integrationConfig(t)
	ctx := context.Background()
	rootDB, err := config.OpenDB(ctx, cfg.DatabaseDSN)
	if err != nil {
		t.Fatalf("OpenDB() error = %v", err)
	}
	defer rootDB.Close()

	schema := fmt.Sprintf("it_superadmin_%d", time.Now().UnixNano())
	if _, err := rootDB.ExecContext(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatalf("create schema: %v", err)
	}
	t.Cleanup(func() {
		_, _ = rootDB.ExecContext(ctx, "DROP SCHEMA "+schema+" CASCADE")
	})
	if _, err := rootDB.ExecContext(ctx, fmt.Sprintf(`
		CREATE TABLE %s.roles (
			id BIGINT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			status SMALLINT NOT NULL
		);
		CREATE TABLE %s.admin_users (
			id BIGINT PRIMARY KEY,
			uid TEXT NOT NULL UNIQUE,
			username TEXT NOT NULL UNIQUE,
			real_name TEXT NOT NULL DEFAULT '',
			email TEXT NOT NULL DEFAULT '',
			phone TEXT NOT NULL DEFAULT '',
			status SMALLINT NOT NULL,
			avatar TEXT NOT NULL DEFAULT '',
			token_version INT NOT NULL DEFAULT 1,
			permission_version BIGINT NOT NULL DEFAULT 1,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE %s.admin_user_roles (
			admin_user_id BIGINT NOT NULL REFERENCES %s.admin_users(id),
			role_id BIGINT NOT NULL REFERENCES %s.roles(id),
			PRIMARY KEY (admin_user_id, role_id)
		);
		INSERT INTO %s.roles (id, name, status)
		VALUES (1, 'superadmin', 1), (2, 'operator', 1);
		INSERT INTO %s.admin_users (id, uid, username, real_name, status)
		VALUES (1, 'admin-1', 'admin-1', 'Admin One', 1);
		INSERT INTO %s.admin_user_roles (admin_user_id, role_id) VALUES (1, 1);
	`, schema, schema, schema, schema, schema, schema, schema, schema)); err != nil {
		t.Fatalf("seed isolated schema: %v", err)
	}

	dsnURL, err := url.Parse(cfg.DatabaseDSN)
	if err != nil {
		t.Fatalf("parse database dsn: %v", err)
	}
	query := dsnURL.Query()
	query.Set("search_path", schema)
	dsnURL.RawQuery = query.Encode()
	db, err := config.OpenDB(ctx, dsnURL.String())
	if err != nil {
		t.Fatalf("open isolated schema: %v", err)
	}
	defer db.Close()

	repo := repository.NewAdminUserRepository(db)
	operatorRoleID := int64(2)
	err = repo.UpdateWithRole(ctx, model.AdminUser{
		ID: 1, UID: "admin-1", Username: "admin-1", RealName: "Admin One", Status: 2,
	}, &operatorRoleID)
	if !errors.Is(err, repository.ErrLastSuperadmin) {
		t.Fatalf("UpdateWithRole() error = %v, want ErrLastSuperadmin", err)
	}
	var status int
	var roleID int64
	if err := db.QueryRowContext(ctx, `
		SELECT u.status, aur.role_id
		FROM admin_users u
		INNER JOIN admin_user_roles aur ON aur.admin_user_id = u.id
		WHERE u.id=1
	`).Scan(&status, &roleID); err != nil {
		t.Fatalf("query protected superadmin: %v", err)
	}
	if status != 1 || roleID != 1 {
		t.Fatalf("protected superadmin status=%d role=%d, want 1/1", status, roleID)
	}

	if _, err := db.ExecContext(ctx, `
			INSERT INTO admin_users (id, uid, username, real_name, status)
			VALUES (2, 'admin-2', 'admin-2', 'Admin Two', 1);
			INSERT INTO admin_user_roles (admin_user_id, role_id) VALUES (2, 1);
		`); err != nil {
		t.Fatalf("insert second superadmin: %v", err)
	}

	downgradeErrors := make(chan error, 2)
	var downgradeStart sync.WaitGroup
	downgradeStart.Add(1)
	for _, admin := range []model.AdminUser{
		{ID: 1, UID: "admin-1", Username: "admin-1", RealName: "Admin One", Status: 2},
		{ID: 2, UID: "admin-2", Username: "admin-2", RealName: "Admin Two", Status: 2},
	} {
		go func() {
			downgradeStart.Wait()
			downgradeErrors <- repo.UpdateWithRole(ctx, admin, &operatorRoleID)
		}()
	}
	downgradeStart.Done()

	downgradeSuccesses := 0
	lastSuperadminRejected := 0
	for range 2 {
		downgradeErr := <-downgradeErrors
		switch {
		case downgradeErr == nil:
			downgradeSuccesses++
		case errors.Is(downgradeErr, repository.ErrLastSuperadmin):
			lastSuperadminRejected++
		default:
			t.Fatalf("unexpected concurrent downgrade error: %v", downgradeErr)
		}
	}
	if downgradeSuccesses != 1 || lastSuperadminRejected != 1 {
		t.Fatalf(
			"concurrent downgrade successes=%d last-superadmin rejections=%d, want 1/1",
			downgradeSuccesses,
			lastSuperadminRejected,
		)
	}

	var enabledSuperadmins int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(DISTINCT u.id)
		FROM admin_users u
		INNER JOIN admin_user_roles aur ON aur.admin_user_id = u.id
		INNER JOIN roles r ON r.id = aur.role_id
		WHERE u.status=1 AND r.status=1 AND r.name='superadmin'
	`).Scan(&enabledSuperadmins); err != nil {
		t.Fatalf("count enabled superadmins: %v", err)
	}
	if enabledSuperadmins != 1 {
		t.Fatalf("enabled superadmins = %d, want 1", enabledSuperadmins)
	}
}

func TestMenuRepositoryRequiresSuperadminRole(t *testing.T) {
	cfg := integrationConfig(t)
	ctx := context.Background()
	rootDB, err := config.OpenDB(ctx, cfg.DatabaseDSN)
	if err != nil {
		t.Fatalf("OpenDB() error = %v", err)
	}
	defer rootDB.Close()

	schema := fmt.Sprintf("it_menu_grant_%d", time.Now().UnixNano())
	if _, err := rootDB.ExecContext(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatalf("create schema: %v", err)
	}
	t.Cleanup(func() {
		_, _ = rootDB.ExecContext(ctx, "DROP SCHEMA "+schema+" CASCADE")
	})
	if _, err := rootDB.ExecContext(ctx, fmt.Sprintf(`
		CREATE TABLE %s.roles (
			id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
			name TEXT NOT NULL UNIQUE
		);
		CREATE TABLE %s.menus (
			id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
			parent_id BIGINT NOT NULL DEFAULT 0,
			name TEXT NOT NULL UNIQUE,
			title TEXT NOT NULL,
			type SMALLINT NOT NULL,
			icon TEXT NOT NULL DEFAULT '',
			sort INT NOT NULL DEFAULT 0,
			status SMALLINT NOT NULL DEFAULT 1,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE %s.role_menus (
			role_id BIGINT NOT NULL REFERENCES %s.roles(id),
			menu_id BIGINT NOT NULL REFERENCES %s.menus(id),
			PRIMARY KEY (role_id, menu_id)
		);
		CREATE TABLE %s.admin_users (
			id BIGINT PRIMARY KEY,
			permission_version BIGINT NOT NULL DEFAULT 1,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`, schema, schema, schema, schema, schema, schema)); err != nil {
		t.Fatalf("create isolated tables: %v", err)
	}

	dsnURL, err := url.Parse(cfg.DatabaseDSN)
	if err != nil {
		t.Fatalf("parse database dsn: %v", err)
	}
	query := dsnURL.Query()
	query.Set("search_path", schema)
	dsnURL.RawQuery = query.Encode()
	db, err := config.OpenDB(ctx, dsnURL.String())
	if err != nil {
		t.Fatalf("open isolated schema: %v", err)
	}
	defer db.Close()

	repo := repository.NewMenuRepository(db)
	_, err = repo.CreateWithRoleGrantAndVersionBump(ctx, model.Menu{
		Name: "new-permission", Title: "New Permission", Type: model.MenuTypeDir, Status: 1,
	}, "superadmin")
	if !errors.Is(err, repository.ErrReferencedRoleNotFound) {
		t.Fatalf("CreateWithRoleGrantAndVersionBump() error = %v, want ErrReferencedRoleNotFound", err)
	}
	var count int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM menus").Scan(&count); err != nil {
		t.Fatalf("count menus: %v", err)
	}
	if count != 0 {
		t.Fatalf("menu count = %d, want 0 after missing role rollback", count)
	}
}
