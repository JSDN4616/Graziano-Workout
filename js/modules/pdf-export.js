/**
 * Graziano Workout - PDF Export & Technical Print Module
 * Triggers clean editorial PDF formatting with document.fonts synchronization
 * and robust afterprint title restoration.
 */

export function exportRoutineToPDF(routine) {
  if (!routine || typeof routine !== "object") {
    console.warn("[PDF Export] No valid routine provided for export.");
    return;
  }

  const originalTitle = document.title;
  const characterClean = (routine.character || "Rutina").replace(/[\s\W]+/g, "_");
  const routineClean = (routine.name || "Tecnica").replace(/[\s\W]+/g, "_");
  const printTitle = `Graziano_Workout_${characterClean}_${routineClean}_Ficha_Tecnica`;

  // Set the print-friendly document title (used by browser as default PDF filename)
  document.title = printTitle;

  // Cleanup handler ensuring title restoration
  let restored = false;
  const restoreTitle = () => {
    if (!restored) {
      document.title = originalTitle;
      restored = true;
    }
  };

  // Listen to afterprint event for prompt restoration
  const onAfterPrint = () => {
    window.removeEventListener("afterprint", onAfterPrint);
    restoreTitle();
  };
  window.addEventListener("afterprint", onAfterPrint, { once: true });

  // Safety fallback timer in case afterprint isn't supported or fired by browser
  setTimeout(restoreTitle, 10000);

  // Synchronize with document.fonts and render frames before launching print dialog
  const triggerPrint = () => {
    requestAnimationFrame(() => {
      try {
        window.print();
      } catch (err) {
        console.error("[PDF Export] Print dialog failed to open:", err);
        restoreTitle();
      }
    });
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready
      .then(() => triggerPrint())
      .catch(() => triggerPrint());
  } else {
    setTimeout(triggerPrint, 50);
  }
}

