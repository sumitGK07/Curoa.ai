"""
Hospital directory endpoints, powering both the "Hospitals Near You"
rail on the chat page and the full hospitals search page.

Distance is computed with the haversine formula from the caller's
lat/lng (query params) to each hospital's stored coordinates. If no
lat/lng is supplied, results are returned without a distance and the
frontend falls back to whatever it already has (e.g. sample data),
matching the phased rollout: real geolocation/maps wiring comes in a
later development step (see README).
"""

import math
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/hospitals", tags=["hospitals"])


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@router.get("", response_model=schemas.HospitalListResponse)
def list_hospitals(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(default=None, description="Search by name, type, or address"),
    open_now: Optional[bool] = Query(default=None),
    emergency: Optional[bool] = Query(default=None),
    lat: Optional[float] = Query(default=None, description="Caller latitude, for distance sorting"),
    lng: Optional[float] = Query(default=None, description="Caller longitude, for distance sorting"),
    limit: int = Query(default=20, le=100),
):
    query = db.query(models.Hospital)

    if q:
        like = f"%{q}%"
        query = query.filter(
            (models.Hospital.name.ilike(like)) |
            (models.Hospital.type.ilike(like)) |
            (models.Hospital.address.ilike(like))
        )
    if open_now is not None:
        query = query.filter(models.Hospital.is_open == open_now)
    if emergency is not None:
        query = query.filter(models.Hospital.emergency == emergency)

    hospitals: List[models.Hospital] = query.all()

    results = []
    for h in hospitals:
        distance = None
        if lat is not None and lng is not None and h.latitude is not None and h.longitude is not None:
            distance = round(haversine_km(lat, lng, float(h.latitude), float(h.longitude)), 1)
        item = schemas.HospitalOut.model_validate(h)
        item.distance_km = distance
        results.append(item)

    if lat is not None and lng is not None:
        results.sort(key=lambda r: (r.distance_km is None, r.distance_km))

    results = results[:limit]
    return schemas.HospitalListResponse(results=results, total=len(results))


@router.get("/{hospital_id}", response_model=schemas.HospitalOut)
def get_hospital(hospital_id: int, db: Session = Depends(get_db)):
    hospital = db.query(models.Hospital).filter(models.Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found.")
    return hospital
