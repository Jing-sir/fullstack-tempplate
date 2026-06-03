package handler

import (
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRegisterRoutesKeepsDynamicParametersAtEnd(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	RegisterRoutes(router, &Handler{
		auth: func(c *gin.Context) {
			c.Next()
		},
	}, nil)

	routes := make(map[string]bool)
	for _, route := range router.Routes() {
		routes[route.Method+" "+route.Path] = true

		parts := strings.Split(strings.Trim(route.Path, "/"), "/")
		for index, part := range parts {
			if strings.HasPrefix(part, ":") && index != len(parts)-1 {
				t.Fatalf("%s %s has dynamic parameter %q before the final path segment", route.Method, route.Path, part)
			}
		}
	}

	for _, expected := range []string{
		"POST /api/v1/permissions/list",
		"GET /api/v1/roles/info/:id",
		"GET /api/v1/roles/menus/:id",
		"PUT /api/v1/roles/menus/:id",
	} {
		if !routes[expected] {
			t.Fatalf("route %q is not registered", expected)
		}
	}
}
