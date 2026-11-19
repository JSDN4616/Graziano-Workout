/**
 * Graziano Workout - Dynamic Table Column Layout Engine
 * Calculates precision column percentages per individual exercise table
 * based on actual content lengths, font metrics, and printable page constraints.
 */

// Font definitions matching print & screen stylesheets
const FONT_MONO_TH = 'bold 8.3px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
const FONT_MONO_TD = '600 9.6px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
const FONT_SANS_NAME = '700 9.6px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const FONT_SANS_NOTES = '400 9.3px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

let _canvas = null;
let _ctx = null;

function measureTextWidth(text, font) {
  if (!text) return 0;
  if (!_ctx) {
    _canvas = document.createElement("canvas");
    _ctx = _canvas.getContext("2d");
  }
  _ctx.font = font;
  return _ctx.measureText(String(text)).width;
}

/**
 * Calculates optimal column widths in percentages for a specific table.
 *
 * @param {Array} exercises - The array of exercise objects for this table.
 * @param {boolean} hasTut - Whether this table includes a TUT column.
 * @returns {Object} Mapping of column identifiers to percentage strings, e.g. { order: "5.5%", ... }
 */
export function calculateTableColumnWidths(exercises = [], hasTut = false) {
  if (!exercises || exercises.length === 0) {
    return getDefaultColumnWidths(hasTut);
  }

  // Cell padding buffer (left + right padding + border + clearance in pixels)
  // At 0.55rem padding in 8.5pt base font ~ 14px total padding + 2px border clearance = 16px
  const PAD_BUFFER = 16;
  const REF_PAGE_WIDTH = 718; // Printable width in px for A4 at 96dpi with 10mm margins

  // 1. Measure ORDER column
  const orderHeaderW = measureTextWidth("#", FONT_MONO_TH);
  const maxOrderValW = exercises.reduce((max, ex) => Math.max(max, measureTextWidth(ex.order || "01", FONT_MONO_TD)), 0);
  const orderPx = Math.max(orderHeaderW, maxOrderValW) + PAD_BUFFER;
  const orderPct = Math.min(6.5, Math.max(5.0, (orderPx / REF_PAGE_WIDTH) * 100));

  // 2. Measure SETS column
  const setsHeaderW = measureTextWidth("SERIES", FONT_MONO_TH);
  const maxSetsValW = exercises.reduce((max, ex) => Math.max(max, measureTextWidth(ex.sets || "3", FONT_MONO_TD)), 0);
  const setsPx = Math.max(setsHeaderW, maxSetsValW) + PAD_BUFFER;
  const setsPct = Math.min(8.5, Math.max(6.8, (setsPx / REF_PAGE_WIDTH) * 100));

  // 3. Measure REST column
  const restHeaderW = measureTextWidth("DESCANSO", FONT_MONO_TH);
  const maxRestValW = exercises.reduce((max, ex) => Math.max(max, measureTextWidth(ex.rest || "—", FONT_MONO_TD)), 0);
  const restPx = Math.max(restHeaderW, maxRestValW) + PAD_BUFFER;
  const restPct = Math.min(12.0, Math.max(9.0, (restPx / REF_PAGE_WIDTH) * 100));

  // 4. Measure TUT column (if present)
  let tutPct = 0;
  if (hasTut) {
    const tutHeaderW = measureTextWidth("TUT", FONT_MONO_TH);
    const maxTutValW = exercises.reduce((max, ex) => Math.max(max, measureTextWidth(ex.tut || "—", FONT_MONO_TD)), 0);
    const tutPx = Math.max(tutHeaderW, maxTutValW) + PAD_BUFFER;
    tutPct = Math.min(11.0, Math.max(8.5, (tutPx / REF_PAGE_WIDTH) * 100));
  }

  // 5. Measure REPS column (adaptive to short reps vs complex notes like "10 - 12 (RIR 1-2)")
  const repsHeaderW = measureTextWidth("REPS", FONT_MONO_TH);
  const maxRepsValW = exercises.reduce((max, ex) => Math.max(max, measureTextWidth(ex.reps || "10", FONT_MONO_TD)), 0);
  const repsPx = Math.max(repsHeaderW, maxRepsValW) + PAD_BUFFER;
  const repsRawPct = (repsPx / REF_PAGE_WIDTH) * 100;
  // If values are short (e.g. "6 - 8"), assign ~10%; if long (e.g. "10 - 12 (RIR 1-2)"), assign up to 16.5%
  const repsPct = Math.min(17.0, Math.max(10.0, repsRawPct));

  // Sum of fixed technical columns
  const fixedTotal = orderPct + setsPct + restPct + tutPct + repsPct;
  const remainingPct = 100.0 - fixedTotal;

  // 6. Partition remaining width between EJERCICIO (name) and NOTAS TÉCNICAS (notes)
  const maxNotesChars = exercises.reduce((max, ex) => {
    const txt = (ex.notes || "").trim();
    return Math.max(max, txt.length);
  }, 0);

  const hasSubstantialNotes = exercises.some((ex) => (ex.notes || "").trim().length > 30);

  let notesPct;
  let namePct;

  if (maxNotesChars === 0 || maxNotesChars <= 10) {
    // Almost no notes (just dashes or empty)
    // Notes needs minimal width for header "NOTAS TÉCNICAS & RPE"
    notesPct = Math.min(19.0, remainingPct * 0.32);
    namePct = remainingPct - notesPct;
  } else if (!hasSubstantialNotes) {
    // Brief notes (1-5 words, e.g. "Aceleración máxima", "Braquial y antebrazo")
    notesPct = Math.min(25.0, remainingPct * 0.40);
    namePct = remainingPct - notesPct;
  } else if (maxNotesChars > 85) {
    // Extensive technical descriptions (like Toji Fushiguro)
    notesPct = Math.min(41.0, remainingPct * 0.62);
    namePct = remainingPct - notesPct;
  } else {
    // Moderate technical notes (35 to 85 characters)
    notesPct = Math.min(33.0, remainingPct * 0.50);
    namePct = remainingPct - notesPct;
  }

  // Normalization to strictly 100.0%
  const round = (num) => Math.round(num * 10) / 10;
  let rOrder = round(orderPct);
  let rSets = round(setsPct);
  let rReps = round(repsPct);
  let rRest = round(restPct);
  let rTut = hasTut ? round(tutPct) : 0;
  let rNotes = round(notesPct);
  let rName = round(namePct);

  // Rebalance exact sum to 100.0% against the largest column (notes or name)
  const currentSum = round(rOrder + rSets + rReps + rRest + rTut + rNotes + rName);
  const diff = round(100.0 - currentSum);
  if (rNotes >= rName) {
    rNotes = round(rNotes + diff);
  } else {
    rName = round(rName + diff);
  }

  const result = {
    order: `${rOrder.toFixed(1)}%`,
    name: `${rName.toFixed(1)}%`,
    sets: `${rSets.toFixed(1)}%`,
    reps: `${rReps.toFixed(1)}%`,
    rest: `${rRest.toFixed(1)}%`,
    notes: `${rNotes.toFixed(1)}%`
  };

  if (hasTut) {
    result.tut = `${rTut.toFixed(1)}%`;
  }

  return result;
}

function getDefaultColumnWidths(hasTut = false) {
  if (hasTut) {
    return {
      order: "5.5%",
      name: "25.5%",
      sets: "7.0%",
      reps: "14.5%",
      rest: "9.5%",
      tut: "9.0%",
      notes: "29.0%"
    };
  }
  return {
    order: "5.5%",
    name: "28.5%",
    sets: "7.0%",
    reps: "15.0%",
    rest: "10.0%",
    notes: "34.0%"
  };
}

/**
 * Builds HTML <colgroup> tag containing <col> elements with the computed widths.
 *
 * @param {Object} colWidths - The object returned by calculateTableColumnWidths
 * @param {boolean} hasTut - Whether TUT column is included
 * @returns {string} HTML string representing the <colgroup>
 */
export function buildColgroupHTML(colWidths, hasTut = false) {
  return `
    <colgroup>
      <col class="col-order" style="width: ${colWidths.order};">
      <col class="col-name" style="width: ${colWidths.name};">
      <col class="col-sets" style="width: ${colWidths.sets};">
      <col class="col-reps" style="width: ${colWidths.reps};">
      <col class="col-rest" style="width: ${colWidths.rest};">
      ${hasTut ? `<col class="col-tut" style="width: ${colWidths.tut};">` : ""}
      <col class="col-notes" style="width: ${colWidths.notes};">
    </colgroup>
  `.trim();
}
