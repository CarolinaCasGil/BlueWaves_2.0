import { useMemo, useState } from 'react'
import './DateRangePicker.css'

export type DateRange = { from: string | null; to: string | null }

type Props = {
	value: DateRange
	onChange: (dr: DateRange) => void
	disabledDates?: Set<string> // YYYY-MM-DD
	placeholderFrom?: string
	placeholderTo?: string
	/** nuevo: fecha mínima seleccionable (por defecto: hoy) */
	minDate?: Date | string | null
}

/* ======= Helpers de fecha ======= */
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function addDays(d: Date, delta: number) {
	const nd = new Date(d)
	nd.setDate(d.getDate() + delta)
	return nd
}
function addMonths(d: Date, delta: number) {
	const nd = new Date(d)
	nd.setMonth(d.getMonth() + delta, 1)
	nd.setHours(0, 0, 0, 0)
	return nd
}
function startOfMonth(d: Date) {
	const nd = new Date(d)
	nd.setDate(1)
	nd.setHours(0, 0, 0, 0)
	return nd
}
function endOfMonth(d: Date) {
	const nd = new Date(d)
	nd.setMonth(d.getMonth() + 1, 0)
	nd.setHours(0, 0, 0, 0)
	return nd
}
function parseISO(iso?: string | null): Date | null {
	if (!iso) return null
	const [y, m, dd] = iso.split('-').map(Number)
	if (!y || !m || !dd) return null
	const d = new Date(y, m - 1, dd)
	d.setHours(0, 0, 0, 0)
	return d
}
function formatISO(d?: Date | null): string | null {
	if (!d) return null
	return toKey(d)
}

/** Construye un set de días ocupados (YYYY-MM-DD) a partir de reservas */
export function buildDisabledSetFromReservas(
	reservas: Array<{ fecha_entrada?: string | Date; fecha_salida?: string | Date }>
) {
	const set = new Set<string>()
	for (const r of reservas) {
		const fe = r.fecha_entrada
			? typeof r.fecha_entrada === 'string'
				? parseISO(r.fecha_entrada)
				: new Date(r.fecha_entrada)
			: null
		const fs = r.fecha_salida
			? typeof r.fecha_salida === 'string'
				? parseISO(r.fecha_salida as string)
				: new Date(r.fecha_salida)
			: null
		if (!fe || !fs) continue
		fe.setHours(0, 0, 0, 0)
		fs.setHours(0, 0, 0, 0)
		// Ocupadas las noches [fe, fs) => salida no se ocupa
		for (let d = new Date(fe); d < fs; d = addDays(d, 1)) {
			d.setHours(0, 0, 0, 0)
			set.add(toKey(d))
		}
	}
	return set
}

/* ======= Componente ======= */
export default function DateRangePicker({
	value,
	onChange,
	disabledDates = new Set(),
	placeholderFrom = 'Entrada',
	placeholderTo = 'Salida',
	minDate = new Date(), // 👈 hoy por defecto
}: Props) {
	// normaliza minDate a las 00:00 del día
	const minDateStart = (() => {
		if (minDate instanceof Date) {
			const d = new Date(minDate)
			d.setHours(0, 0, 0, 0)
			return d
		}
		if (typeof minDate === 'string') {
			return parseISO(minDate) ?? todayStart()
		}
		return todayStart()
	})()

	function todayStart() {
		const t = new Date()
		t.setHours(0, 0, 0, 0)
		return t
	}

	// Mes base mostrado a la izquierda; a la derecha se muestra base+1
	const [baseMonth, setBaseMonth] = useState<Date>(startOfMonth(new Date()))

	const fromD = parseISO(value.from)
	const toD = parseISO(value.to)

	const makeDays = (view: Date) => {
		const start = startOfMonth(view)
		const end = endOfMonth(view)
		const startWeekday = (start.getDay() + 6) % 7 // L=0
		const totalDays = end.getDate()
		const cells: (Date | null)[] = []
		for (let i = 0; i < startWeekday; i++) cells.push(null)
		for (let i = 1; i <= totalDays; i++) {
			const d = new Date(view.getFullYear(), view.getMonth(), i)
			d.setHours(0, 0, 0, 0)
			cells.push(d)
		}
		return cells
	}

	const leftDays = useMemo(() => makeDays(baseMonth), [baseMonth])
	const rightMonth = useMemo(() => addMonths(baseMonth, 1), [baseMonth])
	const rightDays = useMemo(() => makeDays(rightMonth), [rightMonth])

	const isDisabledSet = (d: Date) => disabledDates.has(toKey(d))
	const isBeforeMin = (d: Date) => d < minDateStart
	const isDisabled = (d: Date) => isBeforeMin(d) || isDisabledSet(d)

	const inRange = (d: Date) => {
		if (fromD && toD) return d >= fromD && d < toD
		return false
	}
	const isFrom = (d: Date) => (fromD ? toKey(d) === toKey(fromD) : false)
	const isTo = (d: Date) => (toD ? toKey(d) === toKey(toD) : false)

	const pick = (d: Date) => {
		// NO permitir seleccionar días deshabilitados ni anteriores a minDate
		if (isDisabled(d)) return
		if (!fromD || (fromD && toD)) {
			onChange({ from: formatISO(d), to: null })
			return
		}
		if (d <= fromD) {
			onChange({ from: formatISO(d), to: null })
			return
		}
		// Si hay un día deshabilitado entre from y d, cancelar
		for (let x = new Date(fromD); x < d; x = addDays(x, 1)) {
			x.setHours(0, 0, 0, 0)
			if (isDisabled(x)) return
		}
		onChange({ from: value.from, to: formatISO(d) })
	}

	const nav = (delta: number) => {
		setBaseMonth(prev => startOfMonth(addMonths(prev, delta)))
	}

	const MonthGrid = ({ titleDate, days }: { titleDate: Date; days: (Date | null)[] }) => (
		<div className="bw-dp__monthwrap">
			<div className="bw-dp__head">
				<div className="bw-dp__month">
					{titleDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
				</div>
			</div>

			<div className="bw-dp__grid">
				{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
					<div className="bw-dp__dow" key={d}>{d}</div>
				))}
				{days.map((d, i) => {
					if (!d) return <div className="bw-dp__cell is-empty" key={`e${i}`} />
					const key = toKey(d)
					const disabled = isDisabled(d)
					const classes = [
						'bw-dp__cell',
						disabled && 'is-disabled',
						inRange(d) && 'in-range',
						isFrom(d) && 'is-from',
						isTo(d) && 'is-to',
					].filter(Boolean).join(' ')
					return (
						<button
							type="button"
							key={key}
							className={classes}
							onClick={() => pick(d)}
							disabled={disabled}
							aria-disabled={disabled}
							tabIndex={disabled ? -1 : 0}
							title={disabled ? 'No disponible' : undefined}
						>
							{d.getDate()}
						</button>
					)
				})}
			</div>
		</div>
	)

	return (
		<div className="bw-dp bw-dp--inline">
			<div className="bw-dp__toolbar">
				<div className="bw-dp__chosen">
					<span className={`bw-dp__chip ${fromD ? 'is-set' : ''}`}>
						{value.from ?? placeholderFrom}
					</span>
					<span className="bw-dp__sep">→</span>
					<span className={`bw-dp__chip ${toD ? 'is-set' : ''}`}>
						{value.to ?? placeholderTo}
					</span>
				</div>
				<div className="bw-dp__navgroup">
					<button className="bw-dp__nav" onClick={() => nav(-1)} aria-label="Mes anterior">‹</button>
					<button className="bw-dp__nav" onClick={() => nav(1)} aria-label="Mes siguiente">›</button>
				</div>
			</div>

			<div className="bw-dp__months">
				<MonthGrid titleDate={baseMonth} days={leftDays} />
				<MonthGrid titleDate={rightMonth} days={rightDays} />
			</div>
		</div>
	)
}
