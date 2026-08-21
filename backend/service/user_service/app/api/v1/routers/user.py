from fastapi import APIRouter, HTTPException, status, Depends, Response, Query
from sqlmodel import select
from typing import List
from app.api.v1.deps import SessionDep
from app.core.security import RoleChecker, get_current_user_role, hash_password
from app.crud.user import crud_user
from app.crud.role import crud_role
from app.crud.status_catalog import crud_status
from app.schemas.user import UserGeneralInfo, UserListQuery, UserCreate, UserDetailInfo, UserUpdate, UserRoleUpdate, UserStatusUpdate, UserInfoUpdate
from uuid import UUID

router = APIRouter()

@router.get("/get-user-list", response_model=List[UserGeneralInfo])
def get_user_list(
    session: SessionDep,
    query: UserListQuery = Depends(),
    current_user: dict = Depends(RoleChecker(["Admin", "Manager"]))
):
    if query.status_id is not None and query.role_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yêu cầu không hợp lệ! Bạn chỉ được phép lọc theo 'status_id' HOẶC 'role_id', không được chọn cả hai."
        )
    
    # 1. Lấy danh sách users từ database
    if query.status_id is not None:
        users = crud_user.get_multi_by_status(
            session, query.status_id, query.skip, query.limit
        )
    elif query.role_id is not None:
        users = crud_user.get_multi_by_role(
            session, role_id=query.role_id, skip=query.skip, limit=query.limit
        )
    else:
        users = crud_user.get_multi(session, skip=query.skip, limit=query.limit)

    user_info_list = []
    
    if users:  
        # 2. Chuẩn bị Map cho Role Name
        if query.role_id is not None:
            role_name = crud_role.get_name_by_id(session, query.role_id) or "Unknown"
            role_mapping = {query.role_id: role_name}
        else:
            distinct_role_ids = list({user.role_id for user in users if user.role_id is not None})
            role_mapping = crud_role.get_role_mapping_by_ids(session, distinct_role_ids)
        
        # 3. Chuẩn bị Map cho Display Status (Sử dụng hàm select đã tối ưu)
        distinct_status_ids = list({user.status_id for user in users if user.status_id is not None})
        status_mapping = crud_status.get_status_mapping_by_ids(session, distinct_status_ids)

        # 4. Trộn dữ liệu và ĐÈ status_id thành display_status
        for user in users:
            user_data = user.model_dump()
            
            # Thêm trường role_name
            user_data["role_name"] = role_mapping.get(user.role_id, "Unknown")
            
            user_data["display_status"] = status_mapping.get(user.status_id, "Unknown")
            
            user_info_list.append(user_data)

    return user_info_list

@router.get("/me",  response_model=UserGeneralInfo)
def get_my_info(
    db: SessionDep,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = current_user["user_id"]
    user = crud_user.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hồ sơ người dùng"
        )
    role_name = crud_role.get_name_by_id(db, user.role_id) or "Unknown"
    display_status = crud_status.get_display_status(db, user.status_id)
    
    user_data = user.model_dump()
    user_data["role_name"] = role_name
    user_data["display_status"] = display_status
    return user_data

@router.post("/create-user")
def create_user(
    session: SessionDep,
    new_user: UserCreate,
    current_user: dict = Depends(RoleChecker(["Admin"]))

):
    # Kiểm tra người dùng đã tồn tại chưa
    user_existed = crud_user.get_by_email(session, new_user.email)
    if user_existed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email đã tồn tại"
        )
    if hasattr(new_user, "password") and new_user.password:
        new_user.password = hash_password(new_user.password)
    crud_user.create(session, new_user)
    return{
        "message": "Tạo người " + new_user.username + " thành công!"
    }




@router.get("/get-user/{user_id}", response_model=UserDetailInfo)
def get_user(
    session: SessionDep,
    user_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user = crud_user.get_by_id(session, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )
    role_name = crud_role.get_name_by_id(session, user.role_id) or "Unknown"
    
    user_data = user.model_dump()
    user_data["role_name"] = role_name
    return user_data



@router.patch("/update-role/{user_id}", response_model=UserDetailInfo)
def update_user_role(
    session: SessionDep,
    user_id: UUID, 
    user_update: UserRoleUpdate, 
    current_user: dict = Depends(RoleChecker(["Admin"]))
):
    db_user = crud_user.get_by_id(session, user_id)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )
    existed_role_id = crud_role.get_by_id(session, user_update.role_id)
    if existed_role_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vai trò không tồn tại"
        )

    updated_user = crud_user.update(session, db_user, user_update)
    role_name = crud_role.get_name_by_id(session, updated_user.role_id) or "Unknown"

    user_data = updated_user.model_dump()
    user_data["role_name"] = role_name
    
    return user_data

@router.patch("/update-status/{user_id}", response_model=UserDetailInfo)
def update_user_status(
    session: SessionDep,
    user_id: UUID,                  
    status_update: UserStatusUpdate, 
    current_user: dict = Depends(RoleChecker(["Admin"])) 
):
    db_user = crud_user.get_by_id(session, user_id)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )
    existed_status_id = crud_status.get_by_id(session, status_update.status_id)
    if existed_status_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trạng thái người dùng không tồn tại"
        )
    updated_user = crud_user.update(session, db_user, status_update)
    role_name = crud_role.get_name_by_id(session, updated_user.role_id) or "Unknown"

    user_data = updated_user.model_dump()
    user_data["role_name"] = role_name
    
    return user_data

@router.put("/update-user/{user_id}", response_model=UserDetailInfo)
def update_user(
    session: SessionDep,
    user_id: UUID,  # ĐÃ THÊM: Tiếp nhận tham số user_id kiểu UUID từ URL path
    user_update: UserInfoUpdate,
    current_user: dict = Depends(get_current_user_role)
):
    # 1. Kiểm tra quyền hạn (Chính chủ hoặc Admin mới được phép sửa)
    is_owner = str(current_user["user_id"]) == str(user_id)
    is_admin = str(current_user["role_name"]) == "Admin"
    
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền chỉnh sửa dữ liệu người dùng này"
        )
        
    # 2. Truy vấn user cần cập nhật từ Database bằng user_id mục tiêu
    db_user = crud_user.get_by_id(session, user_id)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )
        
    # 3. Tiến hành cập nhật thông tin
    updated_user = crud_user.update(session, db_user, user_update)
    role_name = crud_role.get_name_by_id(session, updated_user.role_id) or "Unknown"

    user_data = updated_user.model_dump()
    user_data["role_name"] = role_name
    
    return user_data

@router.get("/get-instructor-list", response_model=List[UserGeneralInfo])
def get_instructor_list(
    session: SessionDep,
    query: UserListQuery = Depends(),
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    if query.status_id is None or query.role_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thiếu dữ liệu để xữ lý."
        )
    else:
        users = crud_user.get_instructor_list(session, skip=query.skip, limit=query.limit, status_id=query.status_id, role_id=query.role_id)

    user_info_list = []
    
    if not users:
            return []
    role_name = crud_role.get_name_by_id(session, query.role_id) or "Unknown"
    # display_status = crud_status.get_display_status(session, user.status_id)
        
    user_info_list = []
    for user in users:
        display_status = crud_status.get_display_status(session, user.status_id)
        user_data = user.model_dump()
        user_data["role_name"] = role_name  
        # user_data["status_id"] = display_status
        user_data["display_status"] = display_status
        user_info_list.append(user_data)

    return user_info_list

@router.get("/get-name/{user_id}")
def get_name_by_id(
    db: SessionDep,
    user_id: UUID
):
    return crud_user.get_name_by_id(db, user_id)

@router.post("/logout")
def logout(response: Response):
    # 1. Xóa cookie token (HttpOnly)
    response.delete_cookie(
        key="token",
        path="/",
        httponly=True,
        samesite="lax",  # Hoặc "none" nếu Frontend & Backend khác Domain/HTTPS
        secure=False     # Đổi thành True nếu hệ thống chạy trên HTTPS
    )
    
    # 2. Xóa các cookie phụ khác (nếu có set từ backend)
    response.delete_cookie(key="user_info", path="/")
    response.delete_cookie(key="user_role", path="/")

    return {"message": "Đăng xuất thành công!"}


@router.get("/is-tester/{user_id}")
def is_tester(
    db: SessionDep,
    user_id: UUID,
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
    user = crud_user.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )
    return crud_user.is_tester(db, user_id)


@router.get("/get-tester-list", response_model=List[UserGeneralInfo])
def get_tester_list(
    session: SessionDep,
    skip: int = Query(0, ge=0, description="Số lượng bản ghi bỏ qua"),
    limit: int = Query(100, ge=1, le=1000, description="Số lượng bản ghi tối đa"),
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    # 1. Truy vấn danh sách Tester từ CSDL
    testers = crud_user.get_tester_list(session, skip=skip, limit=limit)
    
    if not testers:
        return []

    # 2. Lấy tên Role (Role ID = 3)
    role_name = crud_role.get_name_by_id(session, 3) or "Tester"
    
    # 3. Tối ưu hóa: Lấy status mapping 1 lần cho tất cả Tester (tránh N+1 query)
    distinct_status_ids = list({user.status_id for user in testers if user.status_id is not None})
    status_mapping = crud_status.get_status_mapping_by_ids(session, distinct_status_ids)

    # 4. Trộn dữ liệu trả về cho Frontend
    user_info_list = []
    for user in testers:
        user_data = user.model_dump()
        user_data["role_name"] = role_name
        user_data["display_status"] = status_mapping.get(user.status_id, "Unknown")
        user_info_list.append(user_data)

    return user_info_list