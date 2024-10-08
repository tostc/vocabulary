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

    g_ComboElement.style.display = "none";

    g_VocabularJSON = await fetch("/vocabularies.json").then(res => res.json());

    _startRound();
}

function _startRound() {
    if(g_Interval)
        clearInterval(g_Interval);

    g_Time = TIMER;
    setProgress(Math.floor(g_Time / TIMER * 100));

    // Pick random vocabulary
    var random = Math.floor(Math.random() * g_VocabularJSON.length);
    while(random == g_LastRandom)
        random = Math.floor(Math.random() * g_VocabularJSON.length);
    g_LastRandom = random;
    g_SelectedVocabulary = g_VocabularJSON[random];

    const props = Object.getOwnPropertyNames(g_SelectedVocabulary);
    const displayIdx = Math.floor(Math.random() * props.length);
    const display = props[displayIdx];
    props.splice(displayIdx, 1);

    g_SearchFor = props[Math.floor(Math.random() * props.length)];

    g_Vocabulary.innerText = g_SelectedVocabulary[display];
    g_Vocabularies.innerHTML = "";

    g_Vocabularies.appendChild(_createSpan(g_SelectedVocabulary[g_SearchFor]));
    const randomBuffer = [random];

    while((g_Vocabularies.children.length < 4) && (randomBuffer.length !== g_VocabularJSON.length)) {
        var random2 = Math.floor(Math.random() * g_VocabularJSON.length);
        if(randomBuffer.find(x => x == random2) == undefined) {
            randomBuffer.push(random2);
            g_Vocabularies.appendChild(_createSpan(g_VocabularJSON[random2][g_SearchFor]));
        }
    }

    _shuffleChildren(g_Vocabularies);

    g_Interval = setInterval(() => {
        g_Time--;
        if(g_Time <= 0) {
            clearInterval(g_Interval);
            g_Interval = null;

            var childrenArray = Array.from(g_Vocabularies.children);
            for (let i = 0; i < childrenArray.length; i++) {
                const element = childrenArray[i];
                element.onclick = null;
                if(element.innerText == g_SelectedVocabulary[g_SearchFor])
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

function _createSpan(text) {
    const span = document.createElement("span");
    // span.classList.add("red-gradiant");
    var wrongAnswer = false;
    span.innerText = text;
    span.onclick = () => {
        if(g_Interval) {
            clearInterval(g_Interval);
            g_Interval = null;
        }

        var childrenArray = Array.from(g_Vocabularies.children);
        for (let i = 0; i < childrenArray.length; i++) {
            const element = childrenArray[i];
            element.onclick = null;
        }

        if(g_SelectedVocabulary[g_SearchFor] == text) {
            g_Combo++;
            span.classList.add("green-gradiant");
            // span.style.backgroundColor = "green";
        }
        else {
            // span.style.backgroundColor = "red";
            span.classList.add("red-gradiant");
            for (let i = 0; i < childrenArray.length; i++) {
                const element = childrenArray[i];
                if(element.innerText === g_SelectedVocabulary[g_SearchFor]) {
                    // element.style.backgroundColor = "green";
                    element.classList.add("green-gradiant");
                    break;
                }
            }

            wrongAnswer = true;
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