from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "TutFree API"
    APP_ENV: str = "dev"
    API_PREFIX: str = "/v1"
    CORS_ORIGINS: str = "http://localhost:8080"

    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/tutfree"
    DATABASE_SYNC_URL: str = "postgresql://postgres:postgres@localhost:5432/tutfree"
    REDIS_URL: str = "redis://localhost:6379/0"

    TWOGIS_API_KEY: str = ""
    TWOGIS_BASE_URL: str = "https://catalog.api.2gis.com/3.0/items"
    TWOGIS_RPM_LIMIT: int = 60

    @property
    def cors_origins(self) -> list[str]:
        return [x.strip() for x in self.CORS_ORIGINS.split(",") if x.strip()]


settings = Settings()
