package service

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"auth-service/internal/model"
)

type stubMenuStore struct {
	menus       []model.Menu
	savedMenus  []int64
	updatedMenu model.Menu
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

func (s *stubMenuStore) Create(context.Context, model.Menu) (int64, error) {
	return 1, nil
}

func (s *stubMenuStore) Update(_ context.Context, menu model.Menu) error {
	s.updatedMenu = menu
	return nil
}

func (s *stubMenuStore) Delete(context.Context, int64) error {
	return nil
}

type stubRoleStore struct {
	role      *model.Role
	savedMenu []int64
}

func (s *stubRoleStore) GetAll(context.Context) ([]model.Role, error) {
	return nil, nil
}

func (s *stubRoleStore) GetByID(context.Context, int64) (*model.Role, error) {
	return s.role, nil
}

func (s *stubRoleStore) GetByAdminUserID(context.Context, int64) ([]model.Role, error) {
	if s.role == nil {
		return nil, nil
	}
	return []model.Role{*s.role}, nil
}

func (s *stubRoleStore) Create(context.Context, model.Role) (int64, error) {
	return 1, nil
}

func (s *stubRoleStore) Update(context.Context, model.Role) error {
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
