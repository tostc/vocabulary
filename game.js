var g_Vocabulary = null;
var g_Vocabularies = null;
var g_ComboElement = null;
var g_TimerElement = null;
var g_VocabularJSON = [];
var g_SelectedVocabulary = {};
var g_LastRandom = -1;
var g_Combo = 0;
var g_Interval = null;
var g_Time = 0;
var g_SearchFor = "";
var g_Probabilities = [];

var g_TimerEnabled = false;
var g_ShowAlwaysRomaji = true;

const REPEAT_COUNT = 10;
const REPEAT_COUNT_INV = 1.0 / REPEAT_COUNT;

const TIMER = 10;

// Initializes the game!
if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initGame);
else
    initGame();

async function initGame() {
    g_Vocabulary = document.getElementById("vocabulary");
    g_Vocabularies = document.getElementById("vocabularies");
    g_ComboElement = document.getElementById("combo");
    g_TimerElement = document.querySelector('.timer-ring-circle')

    const settingsDialog = document.getElementById("settings-dialog");
    document.getElementById("settings").addEventListener("click", () => {
        if(settingsDialog.style.display.toLocaleLowerCase() == "none")
            settingsDialog.style.display = "block";
        else
            settingsDialog.style.display = "none";
    });

    const symbolTable = document.getElementById("symboltable");
    document.getElementById("table").addEventListener("click", () => {
        if(symbolTable.style.display.toLocaleLowerCase() == "none")
            symbolTable.style.display = "block";
        else
            symbolTable.style.display = "none";
    });

    document.getElementById("timer").addEventListener("change", () => {
        g_TimerEnabled = !g_TimerEnabled;
        if(g_TimerEnabled)
            _startTimer();
        else {
            _stopTimer();
        }
    });

    document.getElementById("romaji").addEventListener("change", () => {
        g_ShowAlwaysRomaji = !g_ShowAlwaysRomaji;
    });

    g_ComboElement.style.display = "none";

    g_VocabularJSON = await fetch("vocabularies.json").then(res => res.json());
    g_Probabilities = new Array(g_VocabularJSON.length).fill(1);

    _startRound();
}

function _pickRandomVocabularyIndex() {
    const totalProbability = g_Probabilities.reduce((prev, cur) => prev + cur, 0);

    var randomPropability = Math.random() * totalProbability;
    for (let i = 0; i < g_Probabilities.length; i++) {
        randomPropability -= g_Probabilities[i];
        if(randomPropability < 0) {
            g_Probabilities[i] = Math.max(g_Probabilities[i] - REPEAT_COUNT_INV, 0);
            return i;
        }
    }

    return 0;
}

function _formatText(vocabulary, display, searchfor) {
    if(g_ShowAlwaysRomaji && (((display == "jp") || (display == "writing")) && (searchfor != "jp" && searchfor != "writing"))) {
        return `<div style="text-align:center">${vocabulary["jp"]}</div><div style="text-align:center">${vocabulary["writing"]}</div>`;
    }

    return vocabulary[display];
}

function _startRound() {
    _stopTimer();

    // Pick random vocabulary
    var random = _pickRandomVocabularyIndex();//Math.floor(Math.random() * g_VocabularJSON.length);
    while(random == g_LastRandom)
        random = _pickRandomVocabularyIndex();//Math.floor(Math.random() * g_VocabularJSON.length);
    g_LastRandom = random;
    g_SelectedVocabulary = g_VocabularJSON[random];

    // const props = Object.getOwnPropertyNames(g_SelectedVocabulary);
    // const displayIdx = Math.floor(Math.random() * props.length);
    // const display = props[displayIdx];
    // props.splice(displayIdx, 1);

    const display = g_ShowAlwaysRomaji ? "jp" : "writing";
    g_SearchFor = "de"; // props[Math.floor(Math.random() * props.length)];

    g_Vocabulary.innerHTML = "<div>" + _formatText(g_SelectedVocabulary, display, g_SearchFor) + "</div>";
    g_Vocabularies.innerHTML = "";

    g_Vocabularies.appendChild(_createSpan(g_SelectedVocabulary, display));
    const randomBuffer = [random];

    while((g_Vocabularies.children.length < 6) && (randomBuffer.length !== g_VocabularJSON.length)) {
        var random2 = Math.floor(Math.random() * g_VocabularJSON.length);
        if(randomBuffer.find(x => x == random2) == undefined) {
            randomBuffer.push(random2);
            g_Vocabularies.appendChild(_createSpan(g_VocabularJSON[random2], display));
        }
    }

    _shuffleChildren(g_Vocabularies);

    if(g_TimerEnabled)
        _startTimer();
}

function _startTimer() {
    g_Time = TIMER;
    setProgress(Math.floor(g_Time / TIMER * 100));

    g_Interval = setInterval(() => {
        g_Time--;
        if(g_Time <= 0) {
            _stopTimer();

            g_Probabilities[g_LastRandom] += REPEAT_COUNT_INV;

            var childrenArray = Array.from(g_Vocabularies.children);
            for (let i = 0; i < childrenArray.length; i++) {
                const element = childrenArray[i];
                element.onclick = null;
                if(element.dataset["text"] == g_SelectedVocabulary[g_SearchFor])
                    element.classList.add("green-gradiant");
                    // element.style.backgroundColor = "green";
            }

            g_ComboElement.style.display = "none";
            g_Combo = 0;

            setTimeout(() => _startRound(), 1500);
        }

        setProgress(Math.floor(g_Time / TIMER * 100));
    }, 1000);
}

function _stopTimer() {
    if(g_Interval) {
        clearInterval(g_Interval);
        g_Interval = null;
    }

    g_Time = TIMER;
    setProgress(Math.floor(g_Time / TIMER * 100));
}

function _createSpan(vocabulary, display) {
    const span = document.createElement("span");
    // span.classList.add("red-gradiant");
    var wrongAnswer = false;
    span.dataset["text"] = vocabulary[g_SearchFor];
    span.innerHTML = _formatText(vocabulary, g_SearchFor, display);
    span.onclick = () => {
        _stopTimer();

        var childrenArray = Array.from(g_Vocabularies.children);
        for (let i = 0; i < childrenArray.length; i++) {
            const element = childrenArray[i];
            element.onclick = null;
        }

        if(g_SelectedVocabulary[g_SearchFor] == span.dataset["text"]) {
            g_Combo++;
            span.classList.add("green-gradiant");
            // span.style.backgroundColor = "green";
        }
        else {
            // span.style.backgroundColor = "red";
            span.classList.add("red-gradiant");
            for (let i = 0; i < childrenArray.length; i++) {
                const element = childrenArray[i];
                if(element.dataset["text"] === g_SelectedVocabulary[g_SearchFor]) {
                    // element.style.backgroundColor = "green";
                    element.classList.add("green-gradiant");
                    break;
                }
            }

            wrongAnswer = true;
            g_Probabilities[g_LastRandom] += REPEAT_COUNT_INV;
            g_Combo = 0;
        }

        if(g_Combo > 0) {
            g_ComboElement.innerText = "x" + g_Combo;
            g_ComboElement.style.display = "flex";

            g_ComboElement.style.transform = "scale(1.1) rotate(12deg)";

            setTimeout(() => {
                g_ComboElement.style.transform = "rotate(12deg)";
            }, 200)
        } else {
            g_ComboElement.style.display = "none";
        }

        if(wrongAnswer)
            setTimeout(() => _startRound(), 1500);
        else
            setTimeout(() => _startRound(), 250);
    };

    return span;
}

function _shuffleChildren(parent) {
    var childrenArray = Array.from(parent.children);
    
    // Fisher-Yates (Knuth) shuffle algorithm
    for (var i = childrenArray.length - 1; i >= 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        [childrenArray[i], childrenArray[j]] = [childrenArray[j], childrenArray[i]];
    }

    childrenArray.forEach(child => parent.appendChild(child));
}

function setProgress(percent) {
    const radius = g_TimerElement.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
  
    g_TimerElement.style.strokeDasharray = `${circumference} ${circumference}`;
    g_TimerElement.style.strokeDashoffset = circumference;
  
    const offset = circumference - (percent / 100) * circumference;
    g_TimerElement.style.strokeDashoffset = offset;
}

function changeTab(event, name) {
    const tabContents = Array.from(document.getElementsByClassName("tab-content"));
    
    // Hide all Tabs
    for (const tabContent of tabContents) {
        tabContent.style.display = "none";
        tabContent.classList.remove("active");
    }

    // All tabs are incative
    const tabs = Array.from(document.getElementsByClassName("tab"));
    for (const tab of tabs)
        tab.classList.remove("active");

    const tab = document.getElementById(name);
    tab.style.display = "block";
    tab.classList.add("active");

    event.currentTarget.classList.add("active");
}