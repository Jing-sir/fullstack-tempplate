package service

import (
	"context"
	"errors"

	"auth-service/internal/config"
	"auth-service/internal/crypto"
	"auth-service/internal/model"
	"auth-service/internal/repository"

	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrUserExists         = errors.New("user already exists")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidTwoFACode   = errors.New("invalid two-factor code")
	ErrInvalidIV          = errors.New("invalid iv")
	ErrTwoFAAlreadyBound  = errors.New("two-factor authentication already bound")
)

type CreateUserInput struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required"`
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginInput struct {
	Username  string `json:"username" binding:"required"`
	Password  string `json:"password" binding:"required"`
	TwoFACode string `json:"two_fa_code"`
	IVID      string `json:"iv_id"`
}

type LoginResult struct {
	Token              string            `json:"token,omitempty"`
	TwoFARequired      bool              `json:"twoFaRequired"`
	TwoFASetupRequired bool              `json:"twoFaSetupRequired,omitempty"`
	User               *model.PublicUser `json:"user,omitempty"`
}

type TwoFASetupResult struct {
	OTPAuthURL string `json:"otp_auth_url"`
	Secret     string `json:"secret"`
}

type UserService struct {
	users             *repository.UserRepository
	iv                *IVService
	jwt               *config.JWTManager
	passwordCryptoKey string
	twoFAIssuer       string
}

func NewUserService(users *repository.UserRepository, iv *IVService, jwt *config.JWTManager, passwordCryptoKey, twoFAIssuer string) *UserService {
	return &UserService{
		users:             users,
		iv:                iv,
		jwt:               jwt,
		passwordCryptoKey: passwordCryptoKey,
		twoFAIssuer:       twoFAIssuer,
	}
}

func (s *UserService) CreateUser(ctx context.Context, input CreateUserInput) (model.PublicUser, error) {
	existing, err := s.users.CountByUsername(ctx, input.Username)
	if err != nil {
		return model.PublicUser{}, err
	}
	if existing > 0 {
		return model.PublicUser{}, ErrUserExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return model.PublicUser{}, err
	}

	user := model.User{
		UID:      uuid.NewString(),
		Username: input.Username,
		Email:    input.Email,
		Phone:    input.Phone,
		Password: string(hash),
		Status:   1,
	}
	if err := s.users.Create(ctx, user); err != nil {
		return model.PublicUser{}, err
	}

	created, err := s.users.GetByUsername(ctx, input.Username)
	if err != nil {
		return model.PublicUser{}, err
	}
	if created == nil {
		return model.PublicUser{}, ErrUserNotFound
	}
	return created.Public(), nil
}

func (s *UserService) ListUsers(ctx context.Context) ([]model.PublicUser, error) {
	users, err := s.users.GetAll(ctx)
	if err != nil {
		return nil, err
	}

	publicUsers := make([]model.PublicUser, 0, len(users))
	for _, user := range users {
		publicUsers = append(publicUsers, user.Public())
	}
	return publicUsers, nil
}

func (s *UserService) Login(ctx context.Context, input LoginInput) (LoginResult, error) {
	plainPassword, err := s.plainPassword(ctx, input.Password, input.IVID)
	if err != nil {
		return LoginResult{}, err
	}

	user, err := s.users.GetByUsername(ctx, input.Username)
	if err != nil {
		return LoginResult{}, err
	}
	if user == nil {
		return LoginResult{}, ErrInvalidCredentials
	}

	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(plainPassword)) != nil {
		return LoginResult{}, ErrInvalidCredentials
	}

	if user.TwoFAEnabled {
		if input.TwoFACode == "" {
			return LoginResult{TwoFARequired: true}, nil
		}
		if !user.TwoFASecret.Valid || !totp.Validate(input.TwoFACode, user.TwoFASecret.String) {
			return LoginResult{}, ErrInvalidTwoFACode
		}
	}

	token, err := s.jwt.GenerateToken(user.UID, user.Username)
	if err != nil {
		return LoginResult{}, err
	}

	publicUser := user.Public()
	return LoginResult{
		Token:              token,
		TwoFARequired:      false,
		TwoFASetupRequired: !user.TwoFAEnabled,
		User:               &publicUser,
	}, nil
}

func (s *UserService) SetupTwoFA(ctx context.Context, uid string) (TwoFASetupResult, error) {
	user, err := s.users.GetByUID(ctx, uid)
	if err != nil {
		return TwoFASetupResult{}, err
	}
	if user == nil {
		return TwoFASetupResult{}, ErrUserNotFound
	}
	if user.TwoFAEnabled {
		return TwoFASetupResult{}, ErrTwoFAAlreadyBound
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      s.twoFAIssuer,
		AccountName: user.Username,
	})
	if err != nil {
		return TwoFASetupResult{}, err
	}

	if err := s.users.UpdateTwoFASecret(ctx, user.ID, key.Secret()); err != nil {
		return TwoFASetupResult{}, err
	}

	return TwoFASetupResult{
		OTPAuthURL: key.URL(),
		Secret:     key.Secret(),
	}, nil
}

func (s *UserService) VerifyTwoFA(ctx context.Context, uid, code string) (LoginResult, error) {
	user, err := s.users.GetByUID(ctx, uid)
	if err != nil {
		return LoginResult{}, err
	}
	if user == nil {
		return LoginResult{}, ErrUserNotFound
	}
	if !user.TwoFASecret.Valid || !totp.Validate(code, user.TwoFASecret.String) {
		return LoginResult{}, ErrInvalidTwoFACode
	}
	if err := s.users.EnableTwoFA(ctx, user.ID); err != nil {
		return LoginResult{}, err
	}

	token, err := s.jwt.GenerateToken(user.UID, user.Username)
	if err != nil {
		return LoginResult{}, err
	}

	user.TwoFAEnabled = true
	publicUser := user.Public()
	return LoginResult{
		Token: token,
		User:  &publicUser,
	}, nil
}

func (s *UserService) EnsureSeedUser(ctx context.Context, username, password string) error {
	if username == "" || password == "" {
		return nil
	}

	count, err := s.users.CountByUsername(ctx, username)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return s.users.Create(ctx, model.User{
		UID:      uuid.NewString(),
		Username: username,
		Password: string(hash),
		Status:   1,
	})
}

func (s *UserService) plainPassword(ctx context.Context, password, ivID string) (string, error) {
	if ivID != "" {
		iv, err := s.iv.Get(ctx, ivID)
		if err != nil {
			return "", ErrInvalidIV
		}
		plain, err := crypto.DecryptAESGCM(password, s.passwordCryptoKey, iv)
		_ = s.iv.Delete(ctx, ivID)
		if err != nil {
			return "", ErrInvalidCredentials
		}
		return plain, nil
	}

	iv, err := s.iv.Get(ctx, "")
	if err == nil && iv != "" {
		if plain, decryptErr := crypto.DecryptAESGCM(password, s.passwordCryptoKey, iv); decryptErr == nil {
			return plain, nil
		}
	}
	return password, nil
}
