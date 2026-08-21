from sqlmodel import Field, SQLModel

class Role(SQLModel, table=True):
    __tablename__ = "role"
    role_id: int = Field(primary_key=True)
    role_name: str = Field(nullable=False, max_length=255)
    description: str = Field(nullable=True)