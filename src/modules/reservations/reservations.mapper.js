function toIsoOrNull(value) {
    return value ? new Date(value).toISOString() : null;
}

function toReservationResponse(reservation) {
    const { room } = reservation;
    return {
        id: reservation.id,
        room: {
            id: room.id,
            name: room.name,
            building: { id: room.building.id, name: room.building.name }
        },
        user: { id: reservation.user.id, email: reservation.user.email },
        participants: reservation.participants,
        startTime: toIsoOrNull(reservation.startTime),
        endTime: toIsoOrNull(reservation.endTime),
        status: reservation.status,
        createdAt: toIsoOrNull(reservation.createdAt),
        cancelledAt: toIsoOrNull(reservation.cancelledAt)
    };
}

module.exports = { toReservationResponse };
