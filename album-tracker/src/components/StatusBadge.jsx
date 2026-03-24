import React from 'react'

export default function StatusBadge({ status, label, type }) {
    // type: settle | receive
    let colorClass = ''
    
    if (type === 'settle') {
        colorClass = status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
    } else {
        colorClass = status ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
    }

    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
            {label}
        </span>
    )
}
