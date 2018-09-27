let afterSelectionToolsReady = null;
const selectionToolsReady = (action) => {
    console.log(action);
    const selTools = $("#selection-tools");
    if(selTools.length > 0){
        action(selTools);
    } else {
        afterSelectionToolsReady = action;
    }
};

$(document).ready(() => {
    var selectionEl;

    const markSelection = (function() {
        return function() {
            const s = window.getSelection();
            if(s.extentOffset - s.anchorOffset == 0){
                $("#selection-tools").hide();
            } else {
                $("#selection-tools").show();

                const oRange = s.getRangeAt(0); 
                const oRect = oRange.getBoundingClientRect();
                console.log(window.getSelection());
                console.log(window.getSelection().toString());

                selectionEl.style.left = oRect.left + "px";
                selectionEl.style.top = (oRect.top - $(selectionEl).height()) + "px";
            }
        };
    })();

    $('body').mouseup(markSelection);

    selectionEl = document.createElement("div");
    selectionEl.id = "selection-tools"
    selectionEl.style.border = "solid black 1px";
    selectionEl.style.backgroundColor = "white";
    selectionEl.style.position = "absolute";

    document.body.appendChild(selectionEl);
    $("#selection-tools").hide();

    if(afterSelectionToolsReady){
        afterSelectionToolsReady($("#selection-tools"));
        afterSelectionToolsReady = null;
    }
});