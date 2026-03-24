import { useState } from 'react'
import StatusBadge from './StatusBadge'
import { supabase } from '../lib/supabase'

export default function PurchaseItem({ item, refresh }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Fallback names
    const albumName = item.album_name || '앨범 이름 없음'
    const storeName = item.store_name || '구매처 없음'
    const eventName = item.event_name ? `(${item.event_name})` : ''

    const toggleSettled = async () => {
        setLoading(true)
        await supabase
            .from('purchases')
            .update({ is_settled: !item.is_settled })
            .eq('id', item.id)
        setLoading(false)
        refresh()
    }

    const toggleReceived = async () => {
        setLoading(true)
        await supabase
            .from('purchases')
            .update({ received: !item.received })
            .eq('id', item.id)
        setLoading(false)
        refresh()
    }

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between relative hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                    {/* Placeholder image representation */}
                    <span className="text-white text-xs text-center px-1 break-all opacity-50">IMAGE</span>
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 line-clamp-1">{albumName} {eventName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">{storeName}</span>
                        <span className="text-xs text-slate-500">수량: {item.quantity}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1 items-end">
                    <StatusBadge type="settle" status={item.is_settled} label={item.is_settled ? '정산 완료' : '정산 대기'} />
                    <StatusBadge type="receive" status={item.received} label={item.received ? '수령 완료' : '배송 중'} />
                </div>
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                </button>
            </div>

            {/* Status Modal Popup */}
            {isMenuOpen && (
                <div className="absolute right-4 top-16 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-10 overflow-hidden transform animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                        <span className="font-semibold text-sm">상태 관리</span>
                        <button onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">정산 여부</span>
                            <button
                                disabled={loading}
                                onClick={toggleSettled}
                                className={`w-12 h-6 rounded-full transition-colors relative ${item.is_settled ? 'bg-brand-500' : 'bg-slate-200'}`}
                            >
                                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${item.is_settled ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">수령 여부</span>
                            <button
                                disabled={loading}
                                onClick={toggleReceived}
                                className={`w-12 h-6 rounded-full transition-colors relative ${item.received ? 'bg-brand-500' : 'bg-slate-200'}`}
                            >
                                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${item.received ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}