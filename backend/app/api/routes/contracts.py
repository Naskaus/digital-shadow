"""Contract type management API routes."""
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentAdmin, CurrentUser, DbSession
from app.models import ContractType
from app.schemas import (
    ContractTypeCreate,
    ContractTypeResponse,
    ContractTypeUpdate,
)

router = APIRouter(prefix="/contracts", tags=["contracts"])


@router.get("", response_model=list[ContractTypeResponse])
async def list_contract_types(
    db: DbSession,
    current_user: CurrentUser,
):
    """List all contract types."""
    result = await db.execute(select(ContractType).order_by(ContractType.name))
    return result.scalars().all()


@router.get("/{contract_id}", response_model=ContractTypeResponse)
async def get_contract_type(
    db: DbSession,
    current_user: CurrentUser,
    contract_id: UUID,
):
    """Get a single contract type by ID."""
    result = await db.execute(
        select(ContractType).where(ContractType.id == contract_id)
    )
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract type not found",
        )

    return contract


@router.post("", response_model=ContractTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_contract_type(
    db: DbSession,
    current_user: CurrentAdmin,
    data: ContractTypeCreate,
):
    """Create a new contract type. Admin only."""
    contract = ContractType(**data.model_dump())

    try:
        db.add(contract)
        await db.commit()
        await db.refresh(contract)
        return contract
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contract type name already exists",
        )


@router.patch("/{contract_id}", response_model=ContractTypeResponse)
async def update_contract_type(
    db: DbSession,
    current_user: CurrentAdmin,
    contract_id: UUID,
    data: ContractTypeUpdate,
):
    """Update a contract type. Admin only."""
    result = await db.execute(
        select(ContractType).where(ContractType.id == contract_id)
    )
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract type not found",
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(contract, field, value)

    try:
        await db.commit()
        await db.refresh(contract)
        return contract
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contract type name already exists",
        )


@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contract_type(
    db: DbSession,
    current_user: CurrentAdmin,
    contract_id: UUID,
):
    """Delete a contract type. Admin only."""
    result = await db.execute(
        select(ContractType).where(ContractType.id == contract_id)
    )
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract type not found",
        )

    await db.delete(contract)
    await db.commit()
    return None
