import React from 'react'
import './StatusBadge.css'

export default function StatusBadge({ status, label, type }) {
    // type: settle | receive
    let colorClass = ''
    
    if (type === 'settle') {
        colorClass = status ? 'settle-true' : 'settle-false'
    } else {
        colorClass = status ? 'receive-true' : 'receive-false'
    }

    return (
        <span className={`status-badge ${colorClass}`}>
            {label}
        </span>
    )
}
