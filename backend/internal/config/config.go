package config

import "github.com/caarlos0/env/v11"

type EnvConfig struct {
	Neo4jURI      string `env:"NEO4J_URI"      envDefault:"bolt://localhost:7687"`
	Neo4jUsername string `env:"NEO4J_USERNAME"  envDefault:"neo4j"`
	Neo4jPassword string `env:"NEO4J_PASSWORD"  envDefault:"password"`
	Port          string `env:"PORT"            envDefault:"8080"`
	JWTSecret     string `env:"JWT_SECRET"      envDefault:"aporia-dev-secret-change-in-production"`
	CookieSecure  bool   `env:"COOKIE_SECURE"   envDefault:"false"`
	AllowOrigin   string `env:"ALLOW_ORIGIN"    envDefault:"http://localhost:5173"`
}

func LoadEnv() (EnvConfig, error) {
	return env.ParseAs[EnvConfig]()
}
