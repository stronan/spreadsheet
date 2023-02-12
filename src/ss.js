/**
 * In-browser spreadsheet - just like Excel, only missing a few features.
 */

/**
 * A cell in the spreadsheet.
 */
class Cell {
    constructor(name, value) {
        this.name = name
        this.input = value
        this.value = null
        this.formula = null
        this.parseError = null
    }

    set(input) {
        console.log(`Setting cell ${this.name} to ${input}`)
        // TODO: try converting to number first
        // TODO: proper number/string handling
        this.input = input
        if (input.startsWith("=")) {
            this.formula = parseFormula(input.slice(1))
            if (!this.formula) {
                this.parseError = "#Error"
            }
        } else {
            this.value = Number(input)
            if (isNaN(this.value)) {
                this.value = input
            }
        }
        return this
    }

    resolve() {
        return this.value || this.formula?.resolve()
    }

    render() {
        return this.parseError || this.resolve() || "#NA"
    }
}

class Formula {
    constructor(fn, args) {
        this.fn = fn
        this.args = args
    }

    toString() {
        return `fn: ${this.fn}, args: ${this.args}`
    }

    resolve() {
        // TODO: detect circular references - paint nodes
        const args = this.args.map(ref => sheet.get(ref)?.resolve())
        return this.fn(...args)
    }
}

/**
 * Map cell names to data.
 * @type {Map} id => Cell
 */
let sheet = new Map

const NUM_ROWS = 100
const NUM_COLS = 100

let editCell

const first = "A".charCodeAt(0)

/**
 * Split a cell name into parts.
 * @param name  cell name
 * @returns array where index 1 contains the column name and index 2 contains the row name
 */
const nameParts = (name) => name.match(/^([A-Z]{1,2})([1-9][0-9]*)$/)

function nameToColIndex(name) {
    const colRef = nameParts(name)[1]
    return fromAlpha(colRef.slice(-1)) + fromAlpha(colRef.slice(0, -1)) * 26 - 1
}

/**
 * Get (0-based) row index from a row name.
 * @returns {number} the index or NaN
 */
const nameToRowIndex = (name) => parseInt(nameParts(name)[2]) - 1

/**
 * Convert a letter index to corresponding letter.
 * 0 => nothing, 1 => A, ...
 */
const toAlpha = i => i ? String.fromCharCode(first + i - 1) : ""

/**
 * Convert a letter to corresponding index.
 * nothing => 0, A => 1, ...
 */
const fromAlpha = c => c ? c.charCodeAt(0) - first + 1 : ""

const rowIndexToName = r => (r + 1).toString()
const colIndexToName = c => toAlpha(Math.floor(c / 26)) + toAlpha(c % 26 + 1)

const gridRefToName = (r, c) => `${colIndexToName(c)}${r + 1}`

/**
 * Parse a range (FROM:TO) and return the list of referenced cells.
 */
const parseRange = (rangeStr) => {
    const parts = rangeStr.split(":")
    const row0 = nameToRowIndex(parts[0])
    const col0 = nameToColIndex(parts[0])
    const row1 = nameToRowIndex(parts[1])
    const col1 = nameToColIndex(parts[1])
    return (
        range(row1 - row0 + 1).flatMap(r =>
            range(col1 - col0 + 1).map(c =>
                gridRefToName(row0 + r, col0 + c)))
    )
}

// TODO: make a proper parser
const parseFormula = formula => {
    // Try cell op cell
    let parts = formula.match(/^([A-Z]+[0-9]+)\s*([+\-*/])\s*([A-Z]+[0-9]+)$/)
    if (parts) {
        let fn
        switch (parts[2]) {
            case "+":
                fn = (a, b) => a + b
                break
            case "-":
                fn = (a, b) => a - b
                break
            case "*":
                fn = (a, b) => a * b
                break
            case "/":
                fn = (a, b) => a / b
                break
        }
        return new Formula(fn, [parts[1], parts[3]])
    }

    // Try fn(range)
    parts = formula.match(/^([a-z][A-Za-z]*)\(([A-Z]+[0-9]+:[A-Z]+[0-9]+)\)$/)
    if (parts) {
        let fn
        switch (parts[1]) {
            case "sum":
                fn = (...args) => args.reduce((a, v) => a + v, 0)
                break
            // TODO: support other functions
        }
        // TODO: support arguments other than ranges
        return new Formula(fn, parseRange(parts[2]))
    }

    return null
}

const range = size => [...Array(size).keys()]

const cancelEdit = () => {
    if (editCell) {
        editCell.removeChild(editCell.lastElementChild)
        editCell = null
    }
}

const getCell = id => {
    const cell = sheet.get(id) || new Cell(id, null)
    sheet.set(id, cell)
    return cell
}

const cellEditKey = ev => {
    switch (ev.key) {
        case "Escape":
            cancelEdit()
            break
        case "Enter":
            const cell = getCell(editCell.id)
            cell.set(editCell.lastElementChild.value)
            cancelEdit()
            // TODO: don't render everything
            renderAll()
            break
    }
}

function toggleEdit(target) {
    if (target.className !== "cell") {
        return
    }
    cancelEdit()
    // if (editCell) {
    //     if (editCell === target) {
    //         return
    //     }
    //     editCell.removeChild(editCell.lastElementChild)
    // }
    editCell = target
    // TODO: edit existing SS cell
    const input = document.createElement("input")
    input.setAttribute("placeholder", "value")
    input.setAttribute("autofocus", "true")
    input.onkeyup = cellEditKey
    target.append(input)
}

function newCell(cssClass, id) {
    const newDiv = document.createElement("div")
    newDiv.setAttribute("class", cssClass)
    newDiv.setAttribute("id", id)
    return newDiv
}

const newGridCell = (r, c) => newCell("cell", gridRefToName(r, c))

const newHeadingCell = (heading) => {
    const div = newCell("cell heading", null)
    div.append(heading)
    return div
}

function newRow(r) {
    const newDiv = document.createElement("div")
    newDiv.setAttribute("class", "row")
    newDiv.append(newHeadingCell(rowIndexToName(r)), ...range(NUM_COLS).map(c => newGridCell(r, c)))
    return newDiv
}

/**
 * Create a grid of cells in the DOM.
 */
function drawGrid(grid) {
    const headingRow = document.createElement("div")
    headingRow.setAttribute("class", "row heading")
    headingRow.append(newCell("cell", null), ...range(NUM_COLS).map(c => newHeadingCell(colIndexToName(c))))

    grid.append(headingRow)
    grid.append(...range(NUM_ROWS).map(newRow))
    grid.onclick = (e) => toggleEdit(e.target)
}

const clearCell = (r, c) => {
    const el = document.getElementById(gridRefToName(r, c))
    el.childNodes.forEach(n => el.removeChild(n))
}

/**
 * Clear all cells in the grid.
 */
const clearAll = () =>
    range(NUM_ROWS).forEach(r =>
        range(NUM_COLS).forEach(c =>
            clearCell(r, c)))

const renderCell = cell => {
    console.log("Rendering cell", cell)
    const ref = document.getElementById(cell.name)
    ref.childNodes.forEach(n => ref.removeChild(n))
    ref.appendChild(document.createTextNode(cell.render()))
}

/**
 * Render the spreadsheet contents in the grid.
 */
function renderAll() {
    sheet.forEach(renderCell)
}

const refreshGrid = () => {
    clearAll()
    renderAll()
}

function init() {
    const grid = document.getElementById("sheet")

    if (grid) {
        drawGrid(grid)
        refreshGrid()
    }
}

init()