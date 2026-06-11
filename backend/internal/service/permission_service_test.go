package service

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"auth-service/internal/model"
	"auth-service/internal/repository"
)

type stubMenuStore struct {
	menus       []model.Menu
	savedMenus  []int64
	createdMenu model.Menu
	updatedMenu model.Menu
	statusID    int64
	status      int
	movedID     int64
	movedParent int64
	movedSort   int
	deleteID    int64
	grantRole   string
	grantMenuID int64
	bumpCount   int
	createErr   error
	updateErr   error
}

func (s *stubMenuStore) GetAll(context.Context) ([]model.Menu, error) {
	return s.menus, nil
}

func (s *stubMenuStore) GetByID(_ context.Context, id int64) (*model.Menu, error) {
	for _, menu := range s.menus {
		if menu.ID == id {
			copy := menu
			return &copy, nil
		}
	}
	return nil, nil
}

func (s *stubMenuStore) GetByRoleIDs(context.Context, []int64) ([]model.Menu, error) {
	return s.menus, nil
}

func (s *stubMenuStore) GetMenuIDsByRoleID(context.Context, int64) ([]int64, error) {
	return nil, nil
}

func (s *stubMenuStore) CreateWithRoleGrantAndVersionBump(_ context.Context, menu model.Menu, roleName string) (int64, error) {
	if s.createErr != nil {
		return 0, s.createErr
	}
	const id int64 = 1
	s.createdMenu = menu
	s.grantRole = roleName
	s.grantMenuID = id
	s.bumpCount++
	return id, nil
}

func (s *stubMenuStore) UpdateWithVersionBump(_ context.Context, menu model.Menu) error {
	if s.updateErr != nil {
		return s.updateErr
	}
	s.updatedMenu = menu
	s.bumpCount++
	return nil
}

func (s *stubMenuStore) UpdateStatusWithVersionBump(_ context.Context, id int64, status int) error {
	s.statusID = id
	s.status = status
	s.bumpCount++
	return nil
}

func (s *stubMenuStore) MoveWithVersionBump(_ context.Context, id int64, parentID int64, sort int) error {
	if s.updateErr != nil {
		return s.updateErr
	}
	s.movedID = id
	s.movedParent = parentID
	s.movedSort = sort
	s.bumpCount++
	return nil
}

func (s *stubMenuStore) CountChildren(_ context.Context, id int64) (int, error) {
	count := 0
	for _, menu := range s.menus {
		if menu.ParentID == id {
			count++
		}
	}
	return count, nil
}

func (s *stubMenuStore) DeleteWithVersionBump(_ context.Context, id int64) error {
	s.deleteID = id
	s.bumpCount++
	return nil
}

type stubRoleStore struct {
	role       *model.Role
	adminRoles []model.Role
	savedMenu  []int64
	createErr  error
	updateErr  error
}

func (s *stubRoleStore) GetAll(context.Context) ([]model.Role, error) {
	return nil, nil
}

func (s *stubRoleStore) GetByID(context.Context, int64) (*model.Role, error) {
	return s.role, nil
}

func (s *stubRoleStore) GetByName(context.Context, string) (*model.Role, error) {
	return s.role, nil
}

func (s *stubRoleStore) GetByAdminUserID(context.Context, int64) ([]model.Role, error) {
	if s.adminRoles != nil {
		return s.adminRoles, nil
	}
	if s.role == nil {
		return nil, nil
	}
	return []model.Role{*s.role}, nil
}

func (s *stubRoleStore) Create(context.Context, model.Role) (int64, error) {
	if s.createErr != nil {
		return 0, s.createErr
	}
	return 1, nil
}

func (s *stubRoleStore) CreateWithMenus(_ context.Context, _ model.Role, menuIDs []int64) (int64, error) {
	if s.createErr != nil {
		return 0, s.createErr
	}
	s.savedMenu = menuIDs
	return 1, nil
}

func (s *stubRoleStore) Update(context.Context, model.Role) error {
	if s.updateErr != nil {
		return s.updateErr
	}
	return nil
}

func (s *stubRoleStore) UpdateWithMenus(_ context.Context, _ model.Role, menuIDs []int64) error {
	if s.updateErr != nil {
		return s.updateErr
	}
	s.savedMenu = menuIDs
	return nil
}

func (s *stubRoleStore) Delete(context.Context, int64) error {
	return nil
}

func (s *stubRoleStore) SetMenus(_ context.Context, _ int64, menuIDs []int64) error {
	s.savedMenu = menuIDs
	return nil
}

func permissionFixture() []model.Menu {
	return []model.Menu{
		{ID: 1, ParentID: 0, Name: "systemManage", Type: model.MenuTypeDir},
		{ID: 2, ParentID: 1, Name: "accountManage", Type: model.MenuTypePage},
		{ID: 3, ParentID: 2, Name: "accountManage-edit", Type: model.MenuTypeHidden},
		{ID: 4, ParentID: 2, Name: "accountManage-auditTab", Type: model.MenuTypeTab},
		{ID: 5, ParentID: 4, Name: "accountManage-auditTab-approve", Type: model.MenuTypeButton},
	}
}

func TestPermissionServiceSeparatesNavigationAndPagePermissions(t *testing.T) {
	menus := &stubMenuStore{menus: permissionFixture()}
	roles := &stubRoleStore{role: &model.Role{ID: 1, Status: 1}}
	service := NewPermissionService(roles, menus)

	navigation, err := service.GetMyMenus(context.Background(), &model.AdminUser{ID: 10})
	if err != nil {
		t.Fatalf("GetMyMenus() error = %v", err)
	}
	if len(navigation) != 1 || len(navigation[0].Children) != 1 {
		t.Fatalf("GetMyMenus() = %#v, want directory with one page", navigation)
	}
	if got := navigation[0].Children[0]; got.Name != "accountManage" || len(got.Children) != 0 {
		t.Fatalf("navigation page = %#v, want accountManage without child permissions", got)
	}

	pageTree, err := service.GetMyPagePermissions(context.Background(), 10, "accountManage")
	if err != nil {
		t.Fatalf("GetMyPagePermissions() error = %v", err)
	}
	if len(pageTree) != 2 {
		t.Fatalf("len(pageTree) = %d, want 2", len(pageTree))
	}
	if pageTree[1].Name != "accountManage-auditTab" || len(pageTree[1].Children) != 1 {
		t.Fatalf("pageTree = %#v, want nested tab button", pageTree)
	}
}

func TestPermissionServiceRejectsUnknownPage(t *testing.T) {
	service := NewPermissionService(
		&stubRoleStore{role: &model.Role{ID: 1, Status: 1}},
		&stubMenuStore{menus: permissionFixture()},
	)

	_, err := service.GetMyPagePermissions(context.Background(), 10, "missing")
	if !errors.Is(err, ErrPermissionDenied) {
		t.Fatalf("GetMyPagePermissions() error = %v, want ErrPermissionDenied", err)
	}
}

func TestRoleServiceSetMenusAddsAncestorClosure(t *testing.T) {
	menus := &stubMenuStore{menus: permissionFixture()}
	roles := &stubRoleStore{role: &model.Role{ID: 1}}
	service := NewRoleService(roles, menus)

	if err := service.SetMenus(context.Background(), 1, []int64{5}); err != nil {
		t.Fatalf("SetMenus() error = %v", err)
	}
	if want := []int64{1, 2, 4, 5}; !reflect.DeepEqual(roles.savedMenu, want) {
		t.Fatalf("saved menus = %v, want %v", roles.savedMenu, want)
	}
}

func TestRoleServiceSetMenusRejectsCircularParentChain(t *testing.T) {
	menus := &stubMenuStore{menus: []model.Menu{
		{ID: 1, ParentID: 2, Name: "first", Type: model.MenuTypeDir},
		{ID: 2, ParentID: 1, Name: "second", Type: model.MenuTypeDir},
	}}
	service := NewRoleService(&stubRoleStore{role: &model.Role{ID: 1}}, menus)

	err := service.SetMenus(context.Background(), 1, []int64{1})
	if !errors.Is(err, ErrMenuParentInvalid) {
		t.Fatalf("SetMenus() error = %v, want ErrMenuParentInvalid", err)
	}
}

func TestRoleServiceMapsDuplicateName(t *testing.T) {
	service := NewRoleService(&stubRoleStore{createErr: repository.ErrDuplicateKey}, &stubMenuStore{})

	_, err := service.Create(context.Background(), CreateRoleInput{
		Name:  "admin",
		Title: "管理员",
	})
	if !errors.Is(err, ErrRoleNameTaken) {
		t.Fatalf("Create() error = %v, want ErrRoleNameTaken", err)
	}
}

func TestRoleServiceProtectsSuperadmin(t *testing.T) {
	for _, testCase := range []struct {
		name string
		call func(*RoleService) error
	}{
		{
			name: "rename",
			call: func(service *RoleService) error {
				return service.Update(context.Background(), 1, UpdateRoleInput{
					Name:   "renamed",
					Title:  "超级管理员",
					Status: 1,
				})
			},
		},
		{
			name: "disable",
			call: func(service *RoleService) error {
				return service.Update(context.Background(), 1, UpdateRoleInput{
					Name:   systemRoleName,
					Title:  "超级管理员",
					Status: 0,
				})
			},
		},
		{
			name: "delete",
			call: func(service *RoleService) error {
				return service.Delete(context.Background(), 1)
			},
		},
		{
			name: "replace menus",
			call: func(service *RoleService) error {
				return service.SetMenus(context.Background(), 1, []int64{1})
			},
		},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			roles := &stubRoleStore{role: &model.Role{
				ID:     1,
				Name:   systemRoleName,
				Title:  "超级管理员",
				Status: 1,
			}}
			err := testCase.call(NewRoleService(roles, &stubMenuStore{menus: permissionFixture()}))
			if !errors.Is(err, ErrSystemRoleProtected) {
				t.Fatalf("error = %v, want ErrSystemRoleProtected", err)
			}
		})
	}
}

func TestMenuServiceUpdateRejectsDescendantAsParent(t *testing.T) {
	menus := &stubMenuStore{menus: []model.Menu{
		{ID: 1, ParentID: 0, Name: "root", Type: model.MenuTypeDir},
		{ID: 2, ParentID: 1, Name: "child", Type: model.MenuTypeDir},
	}}
	service := NewMenuService(menus)

	err := service.Update(context.Background(), 1, UpdateMenuInput{
		ParentID: 2,
		Name:     "root",
		Title:    "Root",
		Type:     model.MenuTypeDir,
		Status:   1,
	})
	if !errors.Is(err, ErrMenuParentInvalid) {
		t.Fatalf("Update() error = %v, want ErrMenuParentInvalid", err)
	}
}

func TestMenuServiceProtectsSystemPermissionNodes(t *testing.T) {
	systemMenu := model.Menu{
		ID:       1,
		ParentID: 0,
		Name:     "systemManage",
		Title:    "系统管理",
		Type:     model.MenuTypeDir,
		Status:   1,
	}

	for _, testCase := range []struct {
		name string
		call func(*MenuService) error
	}{
		{
			name: "delete",
			call: func(service *MenuService) error {
				return service.Delete(context.Background(), systemMenu.ID, true)
			},
		},
		{
			name: "disable",
			call: func(service *MenuService) error {
				return service.UpdateStatus(context.Background(), systemMenu.ID, 0)
			},
		},
		{
			name: "move",
			call: func(service *MenuService) error {
				return service.Move(context.Background(), systemMenu.ID, MoveMenuInput{ParentID: 2, Sort: 20})
			},
		},
		{
			name: "change type",
			call: func(service *MenuService) error {
				return service.Update(context.Background(), systemMenu.ID, UpdateMenuInput{
					ParentID: systemMenu.ParentID,
					Name:     systemMenu.Name,
					Title:    systemMenu.Title,
					Type:     model.MenuTypePage,
					Status:   1,
				})
			},
		},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			menus := &stubMenuStore{menus: []model.Menu{systemMenu}}
			err := testCase.call(NewMenuService(menus))
			if !errors.Is(err, ErrSystemMenuProtected) {
				t.Fatalf("error = %v, want ErrSystemMenuProtected", err)
			}
		})
	}
}

func TestSystemPermissionProtectionMatchesSeedBaseline(t *testing.T) {
	for _, key := range []string{
		"systemManage",
		"operationLog",
		"rolePermissions",
		"rolePermissions-add",
		"rolePermissions-view",
		"rolePermissions-edit",
		"rolePermissions-delete",
		"rolePermissions-menuManage",
		"accountManage",
		"accountManage-add",
		"accountManage-edit",
		"accountManage-disable",
		"accountManage-resetPassword",
		"accountManage-reset2FA",
	} {
		if !isSystemPermission(key) {
			t.Fatalf("seed system permission %q is not protected", key)
		}
	}
	if isSystemPermission("permissionLab") {
		t.Fatal("permissionLab should remain an editable validation module")
	}
}

func TestMenuServiceUpdateRejectsPermissionKeyChange(t *testing.T) {
	menus := &stubMenuStore{menus: []model.Menu{
		{ID: 1, ParentID: 0, Name: "systemManage", Title: "系统管理", Type: model.MenuTypeDir, Status: 1},
	}}
	service := NewMenuService(menus)

	err := service.Update(context.Background(), 1, UpdateMenuInput{
		ParentID: 0,
		Name:     "renamedSystemManage",
		Title:    "系统管理",
		Type:     model.MenuTypeDir,
		Status:   1,
	})
	if !errors.Is(err, ErrMenuNameImmutable) {
		t.Fatalf("Update() error = %v, want ErrMenuNameImmutable", err)
	}
	if menus.updatedMenu.ID != 0 {
		t.Fatalf("Update() wrote menu id %d, want no repository update", menus.updatedMenu.ID)
	}
}

func TestMenuServiceMapsDuplicateName(t *testing.T) {
	service := NewMenuService(&stubMenuStore{createErr: repository.ErrDuplicateKey})

	_, err := service.Create(context.Background(), CreateMenuInput{
		Name:  "accountManage",
		Title: "账号管理",
		Type:  model.MenuTypeDir,
	})
	if !errors.Is(err, ErrMenuNameTaken) {
		t.Fatalf("Create() error = %v, want ErrMenuNameTaken", err)
	}
}

func TestMenuServiceCreateGrantsSuperadminAndBumpsPermissionVersion(t *testing.T) {
	menus := &stubMenuStore{}
	service := NewMenuService(menus)

	id, err := service.Create(context.Background(), CreateMenuInput{
		Name:  "systemManage-newButton",
		Title: "新按钮",
		Type:  model.MenuTypeDir,
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if id != 1 {
		t.Fatalf("Create() id = %d, want 1", id)
	}
	if menus.grantRole != "superadmin" || menus.grantMenuID != 1 {
		t.Fatalf("grant role=%q menu=%d, want superadmin/1", menus.grantRole, menus.grantMenuID)
	}
	if menus.bumpCount != 1 {
		t.Fatalf("bumpCount = %d, want 1", menus.bumpCount)
	}
	if menus.createdMenu.Status != 1 {
		t.Fatalf("Create() default status = %d, want 1", menus.createdMenu.Status)
	}
}

func TestMenuServiceCreateRequiresSuperadminRole(t *testing.T) {
	service := NewMenuService(&stubMenuStore{createErr: repository.ErrReferencedRoleNotFound})

	_, err := service.Create(context.Background(), CreateMenuInput{
		Name:   "newRoot",
		Title:  "新目录",
		Type:   model.MenuTypeDir,
		Status: intPointer(1),
	})
	if !errors.Is(err, ErrSystemRoleUnavailable) {
		t.Fatalf("Create() error = %v, want ErrSystemRoleUnavailable", err)
	}
}

func TestMenuServiceCreatePreservesDisabledStatus(t *testing.T) {
	menus := &stubMenuStore{}
	service := NewMenuService(menus)

	_, err := service.Create(context.Background(), CreateMenuInput{
		Name:   "disabledRoot",
		Title:  "禁用目录",
		Type:   model.MenuTypeDir,
		Status: intPointer(0),
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if menus.createdMenu.Status != 0 {
		t.Fatalf("Create() status = %d, want 0", menus.createdMenu.Status)
	}
}

func TestMenuServiceCreateRejectsInvalidStatus(t *testing.T) {
	service := NewMenuService(&stubMenuStore{})

	_, err := service.Create(context.Background(), CreateMenuInput{
		Name:   "invalidStatus",
		Title:  "非法状态",
		Type:   model.MenuTypeDir,
		Status: intPointer(9),
	})
	if !errors.Is(err, ErrMenuStatusInvalid) {
		t.Fatalf("Create() error = %v, want ErrMenuStatusInvalid", err)
	}
}

func intPointer(value int) *int {
	return &value
}

func TestMenuServiceUpdateRejectsIncompatibleExistingChildren(t *testing.T) {
	menus := &stubMenuStore{menus: []model.Menu{
		{ID: 1, ParentID: 0, Name: "root", Type: model.MenuTypeDir},
		{ID: 2, ParentID: 1, Name: "page", Type: model.MenuTypePage},
		{ID: 3, ParentID: 2, Name: "button", Type: model.MenuTypeButton},
	}}
	service := NewMenuService(menus)

	err := service.Update(context.Background(), 2, UpdateMenuInput{
		ParentID: 1,
		Name:     "page",
		Title:    "页面",
		Type:     model.MenuTypeDir,
		Status:   1,
	})
	if !errors.Is(err, ErrMenuChildrenInvalid) {
		t.Fatalf("Update() error = %v, want ErrMenuChildrenInvalid", err)
	}
}

func TestMenuServiceDeleteRejectsChildrenWithoutCascade(t *testing.T) {
	menus := &stubMenuStore{menus: []model.Menu{
		{ID: 1, ParentID: 0, Name: "root", Type: model.MenuTypeDir},
		{ID: 2, ParentID: 1, Name: "child", Type: model.MenuTypePage},
	}}
	service := NewMenuService(menus)

	err := service.Delete(context.Background(), 1, false)
	if !errors.Is(err, ErrMenuHasChildren) {
		t.Fatalf("Delete() error = %v, want ErrMenuHasChildren", err)
	}
	if menus.deleteID != 0 {
		t.Fatalf("Delete() called repository with id %d, want 0", menus.deleteID)
	}
}

func TestMenuServiceDeleteAllowsCascade(t *testing.T) {
	menus := &stubMenuStore{menus: []model.Menu{
		{ID: 1, ParentID: 0, Name: "root", Type: model.MenuTypeDir},
		{ID: 2, ParentID: 1, Name: "child", Type: model.MenuTypePage},
	}}
	service := NewMenuService(menus)

	if err := service.Delete(context.Background(), 1, true); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if menus.deleteID != 1 {
		t.Fatalf("Delete() id = %d, want 1", menus.deleteID)
	}
}

func TestMenuServiceMoveRejectsInvalidParent(t *testing.T) {
	menus := &stubMenuStore{menus: []model.Menu{
		{ID: 1, ParentID: 0, Name: "root", Type: model.MenuTypeDir},
		{ID: 2, ParentID: 1, Name: "page", Type: model.MenuTypePage},
		{ID: 3, ParentID: 2, Name: "button", Type: model.MenuTypeButton},
	}}
	service := NewMenuService(menus)

	err := service.Move(context.Background(), 3, MoveMenuInput{
		ParentID: 1,
		Sort:     10,
	})
	if !errors.Is(err, ErrMenuButtonNeedParent) {
		t.Fatalf("Move() error = %v, want ErrMenuButtonNeedParent", err)
	}
}

func TestMenuServiceMoveUpdatesParentAndSort(t *testing.T) {
	menus := &stubMenuStore{menus: []model.Menu{
		{ID: 1, ParentID: 0, Name: "root", Type: model.MenuTypeDir},
		{ID: 2, ParentID: 1, Name: "firstPage", Type: model.MenuTypePage},
		{ID: 3, ParentID: 2, Name: "button", Type: model.MenuTypeButton},
		{ID: 4, ParentID: 1, Name: "secondPage", Type: model.MenuTypePage},
	}}
	service := NewMenuService(menus)

	if err := service.Move(context.Background(), 3, MoveMenuInput{ParentID: 4, Sort: 20}); err != nil {
		t.Fatalf("Move() error = %v", err)
	}
	if menus.movedID != 3 || menus.movedParent != 4 || menus.movedSort != 20 {
		t.Fatalf("Move() recorded id=%d parent=%d sort=%d, want id=3 parent=4 sort=20",
			menus.movedID, menus.movedParent, menus.movedSort)
	}
}

func TestMenuServiceMoveMapsRepositoryCycle(t *testing.T) {
	menus := &stubMenuStore{
		menus: []model.Menu{
			{ID: 1, ParentID: 0, Name: "root", Type: model.MenuTypeDir},
			{ID: 2, ParentID: 1, Name: "child", Type: model.MenuTypeDir},
		},
		updateErr: repository.ErrMenuCycle,
	}
	service := NewMenuService(menus)

	err := service.Move(context.Background(), 1, MoveMenuInput{ParentID: 2, Sort: 10})
	if !errors.Is(err, ErrMenuParentInvalid) {
		t.Fatalf("Move() error = %v, want ErrMenuParentInvalid", err)
	}
}

func TestMenuServiceUpdateStatus(t *testing.T) {
	menus := &stubMenuStore{menus: []model.Menu{
		{ID: 1, ParentID: 0, Name: "root", Type: model.MenuTypeDir},
	}}
	service := NewMenuService(menus)

	if err := service.UpdateStatus(context.Background(), 1, 0); err != nil {
		t.Fatalf("UpdateStatus() error = %v", err)
	}
	if menus.statusID != 1 || menus.status != 0 {
		t.Fatalf("UpdateStatus() recorded id=%d status=%d, want id=1 status=0", menus.statusID, menus.status)
	}
}
