export const getStatus = (item) => {
    // Determine the overall status based on settled and received
    if (item.is_settled && item.received) return 'COMPLETED'
    if (item.received && !item.is_settled) return 'RECEIVED_ONLY'
    if (item.is_settled && !item.received) return 'SETTLED_ONLY'
    return 'PENDING'
}
