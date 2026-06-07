package service

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"

	"auth-service/internal/config"
	"auth-service/internal/crypto"
	"auth-service/internal/model"
	"auth-service/internal/repository"

	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

// 业务错误定义，handler 层通过 errors.Is 映射为对应 HTTP 状态码
var (
	ErrInvalidCredentials = errors.New("用户名或密码错误")
	ErrUserExists         = errors.New("用户已存在")
	ErrUserNotFound       = errors.New("用户不存在")
	ErrInvalidTwoFACode   = errors.New("2FA 验证码无效")
	ErrInvalidIV          = errors.New("IV 无效或已过期")
	ErrTwoFAAlreadyBound  = errors.New("2FA 已绑定")
	ErrTwoFANotBound      = errors.New("当前账号未绑定 2FA")
)

// CreateUserInput 创建用户的请求参数
type CreateUserInput struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email"    binding:"required"`
	Phone    string `json:"phone"    binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginInput 登录请求参数
type LoginInput struct {
	Username  string `json:"username"   binding:"required"`
	Password  string `json:"password"   binding:"required"`
	TwoFACode string `json:"two_fa_code"`
	IVID      string `json:"iv_id"`
}

// LoginResult 登录响应结果
type LoginResult struct {
	Token              string                 `json:"token,omitempty"`
	TwoFARequired      bool                   `json:"twoFaRequired"`
	TwoFASetupRequired bool                   `json:"twoFaSetupRequired,omitempty"`
	User               *model.PublicAdminUser `json:"user,omitempty"`
}

// TwoFASetupResult 2FA 绑定初始化响应，包含 OTP 二维码链接和密钥
type TwoFASetupResult struct {
	OTPAuthURL string `json:"otp_auth_url"`
	Secret     string `json:"secret"`
}

// PasswordCheckInput 当前用户安全操作前置校验参数
type PasswordCheckInput struct {
	Password string `json:"password" binding:"required"`
	UserID   string `json:"userId"`
	FACode   string `json:"facode"`
	IVID     string `json:"iv_id"`
}

// UpdateCurrentPasswordInput 当前用户修改登录密码参数
type UpdateCurrentPasswordInput struct {
	OldPassword string `json:"oldPassword" binding:"required"`
	Password    string `json:"password"    binding:"required"`
	FACode      string `json:"facode"      binding:"required"`
	IVID        string `json:"iv_id"`
	NewIVID     string `json:"new_iv_id"`
	Type        int    `json:"type"`
}

// UserService 负责用户相关业务逻辑，包括注册、登录、2FA 绑定与验证
type UserService struct {
	users             UserStore          // 用户数据访问接口
	roles             RoleStore          // 角色数据访问接口，用于种子账号授权
	iv                passwordIVStore    // IV 挑战值服务，用于密码传输加密
	jwt               *config.JWTManager // JWT 签发与解析
	passwordCryptoKey string             // AES-GCM 密码解密密钥
	twoFAIssuer       string             // 2FA TOTP 发行方名称（显示在 Authenticator App 中）
}

type passwordIVStore interface {
	Get(ctx context.Context, id string) (string, error)
	Delete(ctx context.Context, id string) error
}

// NewUserService 构造 UserService，所有依赖通过参数注入
func NewUserService(users UserStore, roles RoleStore, iv passwordIVStore, jwt *config.JWTManager, passwordCryptoKey, twoFAIssuer string) *UserService {
	return &UserService{
		users:             users,
		roles:             roles,
		iv:                iv,
		jwt:               jwt,
		passwordCryptoKey: passwordCryptoKey,
		twoFAIssuer:       twoFAIssuer,
	}
}

// CreateUser 注册新用户，校验用户名唯一性后写入数据库，返回脱敏的用户信息
func (s *UserService) CreateUser(ctx context.Context, input CreateUserInput) (model.PublicAdminUser, error) {
	count, err := s.users.CountByUsername(ctx, input.Username)
	if err != nil {
		return model.PublicAdminUser{}, fmt.Errorf("check username: %w", err)
	}
	if count > 0 {
		return model.PublicAdminUser{}, ErrUserExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return model.PublicAdminUser{}, fmt.Errorf("hash password: %w", err)
	}

	user := model.AdminUser{
		UID:      uuid.NewString(),
		Username: input.Username,
		RealName: input.Username,
		Email:    input.Email,
		Phone:    input.Phone,
		Password: string(hash),
		Status:   1,
	}
	if err := s.users.Create(ctx, user); err != nil {
		if errors.Is(err, repository.ErrDuplicateKey) {
			return model.PublicAdminUser{}, ErrUserExists
		}
		return model.PublicAdminUser{}, fmt.Errorf("create user: %w", err)
	}

	// 写入后立即查询以获取数据库生成的字段（如自增 ID、created_at）
	created, err := s.users.GetByUsername(ctx, input.Username)
	if err != nil {
		return model.PublicAdminUser{}, fmt.Errorf("get created user: %w", err)
	}
	if created == nil {
		return model.PublicAdminUser{}, ErrUserNotFound
	}
	return created.Public(), nil
}

// ListUsers 返回所有用户的脱敏列表
func (s *UserService) ListUsers(ctx context.Context) ([]model.PublicAdminUser, error) {
	users, err := s.users.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}

	publicUsers := make([]model.PublicAdminUser, 0, len(users))
	for _, user := range users {
		publicUsers = append(publicUsers, user.Public())
	}
	return publicUsers, nil
}

// Login 处理用户登录，支持密码加密传输和 2FA 验证流程
func (s *UserService) Login(ctx context.Context, input LoginInput) (LoginResult, error) {
	plainPassword, err := s.plainPassword(ctx, input.Password, input.IVID)
	if err != nil {
		return LoginResult{}, err
	}

	user, err := s.users.GetByUsername(ctx, input.Username)
	if err != nil {
		return LoginResult{}, fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		// 用户不存在时与密码错误返回相同错误，避免用户名枚举攻击
		return LoginResult{}, ErrInvalidCredentials
	}
	if user.Status != 1 {
		return LoginResult{}, ErrInvalidCredentials
	}

	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(plainPassword)) != nil {
		return LoginResult{}, ErrInvalidCredentials
	}

	// 未绑定用户只能拿到受限 token，完成绑定后才签发正式登录态
	if !user.TwoFAEnabled {
		token, err := s.jwt.GenerateTwoFASetupToken(user.UID, user.Username, user.TokenVersion)
		if err != nil {
			return LoginResult{}, fmt.Errorf("generate 2fa setup token: %w", err)
		}

		publicUser := user.Public()
		return LoginResult{
			Token:              token,
			TwoFASetupRequired: true,
			User:               &publicUser,
		}, nil
	}

	// 用户已绑定 2FA，需要进行二次验证
	if user.TwoFAEnabled {
		if input.TwoFACode == "" {
			// 前端应弹出 2FA 输入框后重新请求
			return LoginResult{TwoFARequired: true}, nil
		}
		if !user.TwoFASecret.Valid || !totp.Validate(input.TwoFACode, user.TwoFASecret.String) {
			return LoginResult{}, ErrInvalidTwoFACode
		}
	}

	token, err := s.jwt.GenerateToken(user.UID, user.Username, user.TokenVersion)
	if err != nil {
		return LoginResult{}, fmt.Errorf("generate token: %w", err)
	}

	publicUser := user.Public()
	return LoginResult{
		Token:         token,
		TwoFARequired: false,
		User:          &publicUser,
	}, nil
}

// SetupTwoFA 为用户初始化 TOTP 密钥，返回二维码链接供 Authenticator App 扫描
func (s *UserService) SetupTwoFA(ctx context.Context, uid string) (TwoFASetupResult, error) {
	user, err := s.users.GetByUID(ctx, uid)
	if err != nil {
		return TwoFASetupResult{}, fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return TwoFASetupResult{}, ErrUserNotFound
	}
	if user.TwoFAEnabled {
		return TwoFASetupResult{}, ErrTwoFAAlreadyBound
	}

	return s.saveTwoFASecret(ctx, user)
}

// SetupReplacementTwoFA 校验当前密码和旧 2FA 后生成新的 TOTP 密钥
func (s *UserService) SetupReplacementTwoFA(ctx context.Context, uid string, input PasswordCheckInput) (TwoFASetupResult, error) {
	user, err := s.getCurrentUserForSecurity(ctx, uid, input.UserID)
	if err != nil {
		return TwoFASetupResult{}, err
	}
	if err := s.checkPasswordAndTwoFA(ctx, user, PasswordCheckInput{Password: input.Password, FACode: input.FACode, IVID: input.IVID}); err != nil {
		return TwoFASetupResult{}, err
	}

	return s.saveTwoFASecret(ctx, user)
}

func (s *UserService) saveTwoFASecret(ctx context.Context, user *model.AdminUser) (TwoFASetupResult, error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      s.twoFAIssuer,
		AccountName: user.Username,
	})
	if err != nil {
		return TwoFASetupResult{}, fmt.Errorf("generate totp key: %w", err)
	}

	if err := s.users.UpdateTwoFASecret(ctx, user.ID, key.Secret()); err != nil {
		return TwoFASetupResult{}, fmt.Errorf("save totp secret: %w", err)
	}

	return TwoFASetupResult{
		OTPAuthURL: key.URL(),
		Secret:     key.Secret(),
	}, nil
}

// VerifyTwoFA 验证用户提交的 TOTP 验证码，成功后启用 2FA 并签发 JWT
func (s *UserService) VerifyTwoFA(ctx context.Context, uid, code string) (LoginResult, error) {
	user, err := s.users.GetByUID(ctx, uid)
	if err != nil {
		return LoginResult{}, fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return LoginResult{}, ErrUserNotFound
	}
	if !user.TwoFASecret.Valid || !totp.Validate(code, user.TwoFASecret.String) {
		return LoginResult{}, ErrInvalidTwoFACode
	}

	tokenVersion, err := s.users.EnableTwoFA(ctx, user.ID)
	if err != nil {
		return LoginResult{}, fmt.Errorf("enable 2fa: %w", err)
	}

	token, err := s.jwt.GenerateToken(user.UID, user.Username, tokenVersion)
	if err != nil {
		return LoginResult{}, fmt.Errorf("generate token: %w", err)
	}

	user.TwoFAEnabled = true
	user.TokenVersion = tokenVersion
	publicUser := user.Public()
	return LoginResult{
		Token: token,
		User:  &publicUser,
	}, nil
}

// CheckCurrentUserPassword 校验当前登录用户的登录密码
func (s *UserService) CheckCurrentUserPassword(ctx context.Context, uid string, input PasswordCheckInput) error {
	user, err := s.getCurrentUserForSecurity(ctx, uid, input.UserID)
	if err != nil {
		return err
	}
	return s.checkPassword(ctx, user, input)
}

// CheckCurrentUserPasswordAndTwoFA 校验当前登录用户的登录密码和当前 2FA 验证码
func (s *UserService) CheckCurrentUserPasswordAndTwoFA(ctx context.Context, uid string, input PasswordCheckInput) error {
	user, err := s.getCurrentUserForSecurity(ctx, uid, input.UserID)
	if err != nil {
		return err
	}
	return s.checkPasswordAndTwoFA(ctx, user, input)
}

// ValidateCurrentTwoFA 校验当前登录管理员的 2FA 验证码，不要求再次输入登录密码
func (s *UserService) ValidateCurrentTwoFA(ctx context.Context, adminUserID int64, code string) error {
	user, err := s.users.GetByID(ctx, adminUserID)
	if err != nil {
		return fmt.Errorf("get current user: %w", err)
	}
	if user == nil {
		return ErrUserNotFound
	}
	return s.checkTwoFA(user, code)
}

// UpdateCurrentUserPassword 校验旧密码和 2FA 后修改当前登录用户密码
func (s *UserService) UpdateCurrentUserPassword(ctx context.Context, uid string, input UpdateCurrentPasswordInput) error {
	user, err := s.getCurrentUserForSecurity(ctx, uid, "")
	if err != nil {
		return err
	}
	if err := s.checkPasswordAndTwoFA(ctx, user, PasswordCheckInput{Password: input.OldPassword, FACode: input.FACode, IVID: input.IVID}); err != nil {
		return err
	}

	plainPassword, err := s.currentUserPlainPasswordByIVID(ctx, user.UID, input.Password, input.NewIVID)
	if err != nil {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	if err := s.users.UpdatePassword(ctx, user.ID, string(hash)); err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	return nil
}

// GetUserByUID 按 UID 查询管理员用户，不存在时返回 ErrUserNotFound
func (s *UserService) GetUserByUID(ctx context.Context, uid string) (*model.AdminUser, error) {
	user, err := s.users.GetByUID(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("get user by uid: %w", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

// EnsureSeedUser 在数据库中确保种子用户存在，用于开发/测试环境初始化。
// 若 username 或 password 为空则跳过。
func (s *UserService) EnsureSeedUser(ctx context.Context, username, password string) error {
	if username == "" || password == "" {
		return nil
	}

	user, err := s.users.GetByUsername(ctx, username)
	if err != nil {
		return fmt.Errorf("get seed user: %w", err)
	}
	if user == nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return fmt.Errorf("hash seed password: %w", err)
		}

		if err := s.users.Create(ctx, model.AdminUser{
			UID:      uuid.NewString(),
			Username: username,
			RealName: username,
			Password: string(hash),
			Status:   1,
		}); err != nil {
			if !errors.Is(err, repository.ErrDuplicateKey) {
				return fmt.Errorf("create seed user: %w", err)
			}
		}

		user, err = s.users.GetByUsername(ctx, username)
		if err != nil {
			return fmt.Errorf("get created seed user: %w", err)
		}
		if user == nil {
			return ErrUserNotFound
		}
	}

	if s.roles == nil {
		return nil
	}
	role, err := s.roles.GetByName(ctx, "superadmin")
	if err != nil {
		return fmt.Errorf("get superadmin role: %w", err)
	}
	if role == nil {
		return nil
	}
	if err := s.users.SetRole(ctx, user.ID, role.ID); err != nil {
		return fmt.Errorf("bind seed role: %w", err)
	}
	return nil
}

// AdminUserCreateInput 管理员新增账号参数
type AdminUserCreateInput struct {
	Account  string `json:"account"  binding:"required"`
	FullName string `json:"fullName" binding:"required"`
	RoleID   string `json:"roleId"   binding:"required"`
	State    int    `json:"state"`
}

// AdminUserUpdateInput 管理员更新账号参数
type AdminUserUpdateInput struct {
	ID       string `json:"id"`
	Account  string `json:"account"`
	FullName string `json:"fullName"`
	RoleID   string `json:"roleId"`
	State    int    `json:"state"`
}

// AdminUserRow 账号列表行
type AdminUserRow = repository.AdminUserRow

// AdminUserFilter 账号列表过滤
type AdminUserFilter = repository.AdminUserFilter

// AdminUserDetail 账号详情（用于编辑回填）
type AdminUserDetail struct {
	UserID   string `json:"userId"`
	Account  string `json:"account"`
	FullName string `json:"fullName"`
	RoleID   string `json:"roleId"`
	RoleName string `json:"roleName"`
	State    int    `json:"state"`
}

// ListAdminUsers 分页查询管理员账号列表
func (s *UserService) ListAdminUsers(ctx context.Context, f AdminUserFilter) ([]AdminUserRow, int64, error) {
	rows, total, err := s.users.ListPage(ctx, f)
	if err != nil {
		return nil, 0, fmt.Errorf("list admin users: %w", err)
	}
	if rows == nil {
		rows = []AdminUserRow{}
	}
	return rows, total, nil
}

// GetAdminUserDetail 获取管理员账号详情（编辑回填）
func (s *UserService) GetAdminUserDetail(ctx context.Context, uid string) (AdminUserDetail, error) {
	rows, _, err := s.users.ListPage(ctx, repository.AdminUserFilter{UID: uid, Page: 1, PageSize: 1})
	if err != nil {
		return AdminUserDetail{}, fmt.Errorf("get detail row: %w", err)
	}
	if len(rows) == 0 {
		return AdminUserDetail{}, ErrUserNotFound
	}
	row := rows[0]

	return AdminUserDetail{
		UserID:   row.UID,
		Account:  row.Username,
		FullName: row.RealName,
		RoleID:   row.RoleID,
		RoleName: row.RoleName,
		State:    row.Status,
	}, nil
}

// CreateAdminUser 新增管理员账号
func (s *UserService) CreateAdminUser(ctx context.Context, input AdminUserCreateInput) error {
	count, err := s.users.CountByUsername(ctx, input.Account)
	if err != nil {
		return fmt.Errorf("check username: %w", err)
	}
	if count > 0 {
		return ErrUserExists
	}

	// 新账号生成随机初始密码（前端走重置密码流程后再设置正式密码）
	initialHash, err := bcrypt.GenerateFromPassword([]byte(uuid.NewString()), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	state := input.State
	if state == 0 {
		state = 1
	}

	newUser := model.AdminUser{
		UID:      uuid.NewString(),
		Username: input.Account,
		RealName: input.FullName,
		Password: string(initialHash),
		Status:   state,
	}
	if err := s.users.Create(ctx, newUser); err != nil {
		if errors.Is(err, repository.ErrDuplicateKey) {
			return ErrUserExists
		}
		return fmt.Errorf("create user: %w", err)
	}

	created, err := s.users.GetByUsername(ctx, input.Account)
	if err != nil || created == nil {
		return fmt.Errorf("get created user: %w", err)
	}

	if input.RoleID != "" {
		roleIDInt, err := strconv.ParseInt(input.RoleID, 10, 64)
		if err == nil && roleIDInt > 0 {
			if err := s.users.SetRole(ctx, created.ID, roleIDInt); err != nil {
				return fmt.Errorf("set role: %w", err)
			}
		}
	}
	return nil
}

// UpdateAdminUser 更新管理员账号信息（状态、角色等）
func (s *UserService) UpdateAdminUser(ctx context.Context, input AdminUserUpdateInput) error {
	uid := input.ID
	user, err := s.users.GetByUID(ctx, uid)
	if err != nil {
		return fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return ErrUserNotFound
	}

	if input.State != 0 {
		user.Status = input.State
	}
	if input.Account != "" {
		user.Username = input.Account
	}
	if input.FullName != "" {
		user.RealName = input.FullName
	}

	if err := s.users.Update(ctx, *user); err != nil {
		if errors.Is(err, repository.ErrDuplicateKey) {
			return ErrUserExists
		}
		return fmt.Errorf("update user: %w", err)
	}

	if input.RoleID != "" {
		roleIDInt, err := strconv.ParseInt(input.RoleID, 10, 64)
		if err == nil {
			if err := s.users.SetRole(ctx, user.ID, roleIDInt); err != nil {
				return fmt.Errorf("set role: %w", err)
			}
		}
	}
	return nil
}

// ResetAdminUserPassword 重置管理员密码（需要操作者的 2FA 验证，此处仅更新密码）
func (s *UserService) ResetAdminUserPassword(ctx context.Context, targetUID, newPassword string) error {
	user, err := s.users.GetByUID(ctx, targetUID)
	if err != nil {
		return fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return ErrUserNotFound
	}

	plain, decErr := s.plainPassword(ctx, newPassword, "")
	if decErr != nil {
		plain = newPassword
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	return s.users.UpdatePassword(ctx, user.ID, string(hash))
}

// ResetAdminUser2FA 重置管理员 2FA 状态
func (s *UserService) ResetAdminUser2FA(ctx context.Context, targetUID string) error {
	user, err := s.users.GetByUID(ctx, targetUID)
	if err != nil {
		return fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return ErrUserNotFound
	}
	return s.users.ResetTwoFA(ctx, user.ID)
}

func (s *UserService) getCurrentUserForSecurity(ctx context.Context, uid, requestedUID string) (*model.AdminUser, error) {
	if uid == "" {
		return nil, ErrUserNotFound
	}
	user, err := s.users.GetByUID(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("get current user: %w", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	if requestedUID != "" && requestedUID != user.UID {
		return nil, ErrPermissionDenied
	}
	return user, nil
}

func (s *UserService) checkPasswordAndTwoFA(ctx context.Context, user *model.AdminUser, input PasswordCheckInput) error {
	if err := s.checkPassword(ctx, user, input); err != nil {
		return err
	}
	return s.checkTwoFA(user, input.FACode)
}

func (s *UserService) checkTwoFA(user *model.AdminUser, code string) error {
	if !user.TwoFAEnabled || !user.TwoFASecret.Valid {
		return ErrTwoFANotBound
	}
	if !totp.Validate(code, user.TwoFASecret.String) {
		return ErrInvalidTwoFACode
	}
	return nil
}

func (s *UserService) checkPassword(ctx context.Context, user *model.AdminUser, input PasswordCheckInput) error {
	plain, err := s.currentUserPlainPasswordByIVID(ctx, user.UID, input.Password, input.IVID)
	if err != nil {
		return err
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(plain)) != nil {
		return ErrInvalidCredentials
	}
	return nil
}

// currentUserPlainPasswordByIVID 用一次性 IV 解密当前用户密码；key 由 uid 动态生成
func (s *UserService) currentUserPlainPasswordByIVID(ctx context.Context, uid, cipherPassword, ivID string) (string, error) {
	if ivID == "" {
		return cipherPassword, nil
	}
	iv, err := s.iv.Get(ctx, ivID)
	if err != nil {
		return "", ErrInvalidIV
	}
	sum := md5.Sum([]byte(uid + "sys-api"))
	key := hex.EncodeToString(sum[:])
	plain, err := crypto.DecryptAESGCM(cipherPassword, key, iv)
	// IV 一次性使用，无论解密是否成功都删除，防止重放攻击
	_ = s.iv.Delete(ctx, ivID)
	if err != nil {
		return "", ErrInvalidCredentials
	}
	return plain, nil
}

// plainPassword 尝试用 AES-GCM 解密密码；若解密失败则原样返回（兼容明文传输的旧客户端）
func (s *UserService) plainPassword(ctx context.Context, password, ivID string) (string, error) {
	if ivID != "" {
		iv, err := s.iv.Get(ctx, ivID)
		if err != nil {
			return "", ErrInvalidIV
		}
		plain, err := crypto.DecryptAESGCM(password, s.passwordCryptoKey, iv)
		// IV 一次性使用，无论解密是否成功都删除，防止重放攻击
		_ = s.iv.Delete(ctx, ivID)
		if err != nil {
			return "", ErrInvalidCredentials
		}
		return plain, nil
	}

	// 兼容旧客户端：尝试使用遗留全局 IV 解密；若不存在则视为明文
	iv, err := s.iv.Get(ctx, "")
	if err == nil && iv != "" {
		if plain, decryptErr := crypto.DecryptAESGCM(password, s.passwordCryptoKey, iv); decryptErr == nil {
			return plain, nil
		}
	}
	return password, nil
}
