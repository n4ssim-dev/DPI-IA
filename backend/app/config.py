from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://dpi:dpi@db:5432/dpi"
    jwt_secret: str = "changeme"


settings = Settings()
