from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://dpi:dpi@db:5432/dpi"
    jwt_secret: str = "changeme"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8
    documents_dir: str = "/app/storage"


settings = Settings()
