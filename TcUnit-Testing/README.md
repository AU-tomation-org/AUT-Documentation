# Unit Testing with TcUnit

This document describes how to set up, structure, and write unit tests for TwinCAT 3 libraries using [TcUnit](https://www.tcunit.org).

The conventions and examples here are derived from the `AUT_LGTM_Test` project in the AU-tomation organisation.

---

## How TcUnit Works

TcUnit is a unit testing framework for TwinCAT 3 structured text. It runs entirely inside the PLC, without any external test runner.

**Execution flow:**

1. The PLC starts normally on the target (UmRT or real-time runtime).
2. `PRG_TEST` calls `TcUnit.RUN_IN_SEQUENCE()` every PLC cycle.
3. TcUnit drives each registered `FB_TestSuite` in order, calling every method once per cycle pass until all suites are complete.
4. Results are written to an XML file on disk when all tests have finished (requires `XUNITENABLEPUBLISH = TRUE` -- see [TcUnit library parameter](#tcunit-library-parameter)).
5. `TcCIBuilder` reads the XML file and maps results to the GitHub Actions check run.

**Key properties:**

- Tests run on the PLC target, not on the PC. There is no mock runtime.
- Each test suite (`FB_TestSuite` subclass) is a Function Block. Each test case is a Method.
- A single-cycle test completes in one PLC scan. A multi-cycle test spans many scans.
- TcUnit automatically calls `TEST_FINISHED()` if you forget it, but it is better to call it explicitly at the end of each test.

---

## Project Setup

### 1. Add a test project to the solution

Add a new TwinCAT PLC project to the solution. Name it with the `-Test` suffix:

```
<SolutionName>-Test\
  <SolutionName>-Test.plcproj
  Test\                        <- PLC name
    POUs\
      PRG_TEST.TcPOU
      <FBName>_Test.TcPOU      <- one per FB under test
    PlcTask.TcTTO
    Test.tmc
```

The PLC inside the project is named `Test`. The main program is `PRG_TEST`.

### 2. Add the TcUnit library reference

In the `.plcproj`, add a `PlaceholderReference` for TcUnit:

```xml
<PlaceholderReference Include="TcUnit">
  <DefaultResolution>TcUnit, * (www.tcunit.org)</DefaultResolution>
  <Namespace>TcUnit</Namespace>
  <Parameters>
    <Parameter ListName="GVL_PARAM_TCUNIT" xmlns="">
      <Key>XUNITENABLEPUBLISH</Key>
      <Value>TRUE</Value>
    </Parameter>
  </Parameters>
</PlaceholderReference>
```

In the TwinCAT XAE UI: right-click **References** in the PLC project tree, select **Add library**, search for `TcUnit`.

### 3. TcUnit library parameter

The `XUNITENABLEPUBLISH` parameter controls whether TcUnit writes the results XML to disk.

| Value | Behaviour |
|---|---|
| `FALSE` (default) | Tests run but no XML is written. CI will time out waiting for results. |
| `TRUE` | Results are written to `%TC_BOOTPRJPATH%tcunit_xunit_testresults.xml` |

With UmRT Default the file ends up at:

```
C:\ProgramData\Beckhoff\TwinCAT\3.1\Runtimes\UmRT_Default\3.1\Boot\tcunit_xunit_testresults.xml
```

**This parameter must be set to `TRUE` in every test project. It is not inherited from the library defaults.**

### 4. PRG_TEST

`PRG_TEST` is the only program in the test PLC. It declares one instance per test suite and calls `RUN_IN_SEQUENCE()`:

```
{attribute 'no-analysis'}
PROGRAM PRG_TEST
VAR
    {attribute 'analysis' := '-33'}
    _LogBuffer_Test    : LogBuffer_Test;
    _LogClient_Test    : LogClient_Test;
    // ... one per suite
END_VAR

TcUnit.RUN_IN_SEQUENCE();
```

Use `RUN_IN_SEQUENCE()` instead of `RUN()`. With `RUN_IN_SEQUENCE()`, TcUnit runs one suite at a time and waits for it to finish before starting the next. This is essential for multi-cycle tests: without it, all suites run in parallel and multi-cycle tests can interfere with each other.

`{attribute 'analysis' := '-33'}` suppresses the "variable is assigned but never used" warning for suite instances that do not have an explicit output.

---

## Writing Test Suites

### FB structure

Each test suite is a Function Block that extends `TcUnit.FB_TestSuite`. One suite per FB under test:

```
{attribute 'no-analysis'}
FUNCTION_BLOCK LogBuffer_Test EXTENDS TcUnit.FB_TestSuite
```

The body of the FB calls the test methods in the order you want them to appear in the report:

```
InitialState_IsEmptyAndCountZero();
Push_CountIsOne_IsEmptyFalse();
Pop_ReturnsEntryAndEmptiesBuffer();
PopWhenEmpty_ReturnsFalse();
GetAll_ReturnsFIFOOrder();
OverflowDropsOldestEntry();
Clear_ResetsToEmptyState();
```

`{attribute 'no-analysis'}` on the FB suppresses analysis warnings that would be triggered by the framework's internal machinery.

### Method naming

Use the pattern `<Action>_<Context>_<ExpectedResult>`:

```
InitialState_IsEmptyAndCountZero
Push_CountIsOne_IsEmptyFalse
Pop_ReturnsEntryAndEmptiesBuffer
OverflowDropsOldestEntry
```

The method name becomes the test case name in the report. Keep it descriptive and self-documenting.

### Variable naming

Follow the same convention as the library under test:

- PascalCase type name with a `_` prefix for the instance: `_LogBuffer : LogBuffer;`
- `_Result`, `_Done`, `_i` for helpers.

### VAR_INST vs VAR

**Use `VAR_INST` for Function Block instances** (including the FB under test) and for state variables that must persist across PLC cycles.

**Use `VAR` for simple value types** that are only needed within one cycle.

```
METHOD Push_CountIsOne_IsEmptyFalse
VAR_INST
    _LogBuffer : LogBuffer;   // FB instance - survives across cycles
END_VAR
VAR
    _LogEntry : LogEntry;     // struct - only needed this cycle
END_VAR
```

**Why `VAR_INST` for FBs?** TwinCAT methods normally allocate local variables on the stack each call. A Function Block instance contains state and must not be re-created on every call. `VAR_INST` stores the variable in the FB's own memory (like a field), not on the stack. Without it, the FB is silently re-initialised every call and large FBs can cause a stack overflow.

### Test isolation

Each test method is completely independent. It creates its own fresh instances via `VAR_INST`, exercises one specific behaviour, and ends with `TEST_FINISHED()`. There is no shared state between methods.

If a test needs a specific initial condition (e.g. `SendInterval := T#2H` to prevent ADS sends), set it as a struct initialiser on the `VAR_INST` declaration:

```
VAR_INST
    _LogClient : LogClient := (SendInterval := T#2H);
END_VAR
```

### Assert functions

TcUnit provides typed assert functions. Use the most specific one available:

| Function | When to use |
|---|---|
| `AssertTrue(Condition, Message)` | Boolean TRUE |
| `AssertFalse(Condition, Message)` | Boolean FALSE |
| `AssertEquals_UDINT(Expected, Actual, Message)` | Unsigned 32-bit integer |
| `AssertEquals_DINT(Expected, Actual, Message)` | Signed 32-bit integer |
| `AssertEquals_STRING(Expected, Actual, Message)` | STRING |
| `AssertEquals_BOOL(Expected, Actual, Message)` | BOOL (use AssertTrue/False when possible) |

Always supply a descriptive `Message`. It appears in the test report next to the assertion result and is the only context available when a test fails in CI.

---

## Test Templates

### Template 1: Single-cycle test

For tests that complete in one PLC scan (pure logic, no timers, no ADS).

```
METHOD <Action>_<Context>_<ExpectedResult>
VAR_INST
    _<Type> : <Type>;
END_VAR
VAR
    // simple value types only
END_VAR

// ── Test ──────────────────────────────────────────────────────────────────
// One-line description of what this test verifies.
// ─────────────────────────────────────────────────────────────────────────
TEST('<Action>_<Context>_<ExpectedResult>');

// Arrange
// ...

// Act
// ...

// Assert
AssertTrue(
    Condition := <condition>,
    Message   := '<description>');

TEST_FINISHED();
```

**Rules:**
- No `IF NOT _Done` wrapper needed.
- `TEST_FINISHED()` is at the very end, unconditionally.
- The `TEST(...)` name must match the method name exactly.

### Template 2: Multi-cycle test (polling)

For tests that need multiple PLC scans to complete -- timers, state machines, external feedback.

```
METHOD <Action>_<Context>_<ExpectedResult>
VAR_INST
    _<Type>  : <Type>;
    _Done    : BOOL;
END_VAR
VAR
    // optional locals
END_VAR

// ── Test (slow ~<N> s) ────────────────────────────────────────────────────
// One-line description. Note the expected duration so reviewers are not
// surprised by the test taking many cycles.
// ─────────────────────────────────────────────────────────────────────────
TEST('<Action>_<Context>_<ExpectedResult>');

IF NOT _Done THEN
    // Drive the FB under test every cycle
    _<Type>(...);

    // Check the completion condition
    IF <completion_condition> THEN
        _Done := TRUE;

        AssertEquals_UDINT(
            Expected := <expected>,
            Actual   := <actual>,
            Message  := '<description>');

        TEST_FINISHED();
    END_IF
END_IF
```

**Rules:**
- `_Done` is `VAR_INST` so it persists between cycles.
- The FB under test is also `VAR_INST`.
- `TEST(...)` is called every cycle but TcUnit is idempotent -- calling it again after `TEST_FINISHED()` has no effect.
- Once `_Done` is TRUE the method body is skipped; the test result is already locked.
- Do not call `TEST_FINISHED()` outside the `IF NOT _Done` block or you will close the test prematurely.

**Example (from `TraceClient_Test`):**

```
METHOD TestMachine_WashCycle_Flushes4Spans
VAR_INST
    _TraceClient : TraceClient := (SendInterval := T#2H);
    _TestMachine : TestMachine;
    _Done        : BOOL;
END_VAR

// ── Test (slow ~17 s) ────────────────────────────────────────────────────
// TestMachine completes one wash cycle and flushes exactly 4 spans.
// ─────────────────────────────────────────────────────────────────────────
TEST('TestMachine_WashCycle_Flushes4Spans');

IF NOT _Done THEN
    _TraceClient();
    _TestMachine(TraceClient := _TraceClient);
    IF _TraceClient.BufferCount = 4 THEN
        _Done := TRUE;
        AssertEquals_UDINT(
            Expected := 4,
            Actual   := _TraceClient.BufferCount,
            Message  := 'WashCycle must produce 4 spans: WashCycle, Filling, Washing, Draining');
        TEST_FINISHED();
    END_IF
END_IF
```

### Template 3: Multi-cycle test with timeout guard

For production use, always add a timeout so a stalled test does not block CI indefinitely.

```
METHOD <Action>_<Context>_<ExpectedResult>
VAR_INST
    _<Type>   : <Type>;
    _Done     : BOOL;
    _Timeout  : TON;
END_VAR

TEST('<Action>_<Context>_<ExpectedResult>');

IF NOT _Done THEN
    _<Type>(...);
    _Timeout(IN := TRUE, PT := T#<N>S);

    IF <completion_condition> THEN
        _Done := TRUE;
        AssertEquals_UDINT(Expected := <expected>, Actual := <actual>, Message := '<ok>');
        TEST_FINISHED();
    ELSIF _Timeout.Q THEN
        _Done := TRUE;
        AssertTrue(Condition := FALSE, Message := 'Test timed out after <N> s');
        TEST_FINISHED();
    END_IF
END_IF
```

Set the timeout to roughly 2x the expected duration to allow for slow targets.

---

## Pragmas and Warnings

| Pragma | Where | Purpose |
|---|---|---|
| `{attribute 'no-analysis'}` | FB declaration | Suppresses all static analysis warnings on the test suite. Required because TcUnit's inheritance pattern triggers several framework-level warnings that are not actionable. |
| `{attribute 'analysis' := '-33'}` | VAR block in `PRG_TEST` | Suppresses "variable declared but never used" (SA0033) for suite instances that are called implicitly via `RUN_IN_SEQUENCE`. |

Do not suppress warnings globally in the project settings. Apply them only where needed.

---

## What to Test

### Test behaviour, not implementation

Write tests that verify observable behaviour (return values, output variables, buffer counts, state transitions), not internal implementation details. Tests tied to internal structure break whenever you refactor.

**Good:**
```
// Verifies the public contract: after Push, Count = 1
AssertEquals_UDINT(Expected := 1, Actual := _LogBuffer.Count, ...);
```

**Avoid:**
```
// Verifies internal array index -- breaks on any internal refactor
AssertEquals_UDINT(Expected := 0, Actual := _LogBuffer._writeIndex, ...);
```

### Isolate from external dependencies

If the FB under test would normally make ADS calls or send data over a network, prevent it from doing so during tests. Common techniques:

- Set `SendInterval := T#2H` (or another very large value) to prevent the send timer from firing.
- Pass a dummy VAR_IN_OUT where ADS/network activity happens, so the FB exercises its buffer logic without needing a real endpoint.

### Suggested test cases for a typical FB

For any FB with a buffer:

| Test | What it checks |
|---|---|
| `InitialState_*` | Default-constructed FB has sane initial values |
| `Push_*` | One push increments Count and clears IsEmpty |
| `Pop_*` | Pop returns the pushed data and decrements Count |
| `PopWhenEmpty_*` | Pop on empty buffer returns FALSE / does not crash |
| `GetAll_ReturnsFIFOOrder` | Order is preserved (oldest first) |
| `Overflow_DropsOldest` | Drop-oldest policy is enforced; Dropped counter increments |
| `Clear_*` | Clear resets Count and IsEmpty |

---

## CI Integration

The test project is built and executed automatically by `TcCIBuilder` as part of the CI workflow. No separate step is needed -- `TcCIBuilder` activates the test PLC on UmRT, waits for the results XML, and converts it to a JUnit report visible in the GitHub Actions check run.

See [CI/CD GitHub Actions - TwinCAT Self-Hosted Runner](../CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/README.md) for the full workflow setup, including the UmRT pre-start step and the `XUNITENABLEPUBLISH` gotcha (Issues 10 and 11).

---

## Reference: AUT_LGTM_Test structure

```
AUT_LGTM_Test\
  Test\
    POUs\
      PRG_TEST.TcPOU          PROGRAM - entry point, calls RUN_IN_SEQUENCE
      LogBuffer_Test.TcPOU    7 single-cycle tests for LogBuffer
      LogClient_Test.TcPOU    3 single-cycle tests for LogClient
      MetricBuffer_Test.TcPOU tests for MetricBuffer
      MetricClient_Test.TcPOU tests for MetricClient
      TraceBuffer_Test.TcPOU  tests for TraceBuffer
      TraceClient_Test.TcPOU  5 single-cycle + 1 multi-cycle (~17 s)
      TestMachine.TcPOU       helper FB used by TraceClient_Test
    PlcTask.TcTTO
    Test.tmc
  Test.plcproj
```
