let testList

function test(name = null, fn, expected) {
    const actual = fn()
    const resultEl = document.createElement("li")
    const result = (actual !== undefined) && (actual !== null) && (actual.toString() === expected.toString())
    resultEl.append(`${result ? "Pass" : "Fail"}: ${name || fn}, expected ${expected}, actual ${actual}`)
    resultEl.style.color = result ? "green" : "red"
    testList.append(resultEl)
}

function runTests() {
    testList = document.getElementById("tests")

    test(null, () => gridRefToName(10, 6), "G11")
    test(null, () => gridRefToName(0, 26), "AA1")
    test(null, () => nameParts("A1").slice(1, 3), ["A", "1"])
    test(null, () => nameParts("AA12").slice(1, 3), ["AA", "12"])
    test(null, () => nameToRowIndex("AA12"), 11)
    test(null, () => nameToColIndex("A1"), 0)
    test(null, () => nameToColIndex("AA12"), 26)
    test(null, () => nameToColIndex("AZ12"), 51)
    test(null, () => parseRange("Z1:AB2"), ["Z1", "AA1", "AB1", "Z2", "AA2", "AB2"])
    test(null, () => parseFormula("A1-C2"), "fn: (a, b) => a - b, args: A1,C2")
    test(null, () => parseFormula("sum(A1:B2)"), "fn: (...args) => args.reduce((a, v) => a + v, 0), args: A1,B1,A2,B2")
    test("Resolve formula", () => {
        getCell("A1").set("2")
        getCell("B1").set("3")
        return getCell("C1").set("=A1 + B1").render()
    }, 5)
    test("Parse error", () => getCell("C1").set("=A1 +").render(), "#Error")
}

runTests()
