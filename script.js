// Enable WebMidi API and handle any errors if it fails to enable.
// This is necessary to work with MIDI devices in the web browser.
await WebMidi.enable();

let transposition = 0;

// Initialize variables to store the first MIDI input and output devices detected.
// These devices can be used to send or receive MIDI messages.
let myInput = WebMidi.inputs[0];
let myOutput = WebMidi.outputs[0].channels[1];

// Get the dropdown elements from the HTML document by their IDs.
// These dropdowns will be used to display the MIDI input and output devices available.
let dropInsIO = document.getElementById("dropdown-insIO");
let dropOutsIO = document.getElementById("dropdown-outsIO");
let dropChord = document.getElementById("dropdown-chord");
let slider = document.getElementById("slider");

// Slider was changed to this to make it easier to do the chord function but still leave in the option to transpose because its a nice quality of life feature
slider.addEventListener("input", function () {
  document.getElementById(
    "sliderResult"
  ).innerText = `${slider.value} semitones`;
  transposition = parseInt(slider.value);
});

// For each MIDI input device detected, add an option to the input devices dropdown.
// This loop iterates over all detected input devices, adding them to the dropdown.
WebMidi.inputs.forEach(function (input, num) {
  dropInsIO.innerHTML += `<option value=${num}>${input.name}</option>`;
});

// Similarly, for each MIDI output device detected, add an option to the output devices dropdown.
// This loop iterates over all detected output devices, adding them to the dropdown.
WebMidi.outputs.forEach(function (output, num) {
  dropOutsIO.innerHTML += `<option value=${num}>${output.name}</option>`;
});

// define MIDI processing function
const midiProcess = function (midiNoteInput) {
  let rootNote = midiNoteInput.note.number + transposition;
  let chordType = dropChord.value;
  // this lets us change the intervals that are being pushed to the output
  let intervals;
  // if else matrix that goes through the basic chord options that are provided
  if (chordType == "no chord") {
    intervals = [0]; // Just the notes that the person plays
  } else if (chordType == "major") {
    intervals = [0, 4, 7]; // Major chord intervals
  } else if (chordType == "minor") {
    intervals = [0, 3, 7]; // Minor chord intervals
  } else if (chordType == "augmented") {
    intervals = [0, 4, 8]; // Augmented chord intervals
  } else if (chordType == "diminished") {
    intervals = [0, 3, 6]; // Diminished chord intervals
  }

  // looking into different ways to do this the map function was suggested and worked. Apparently the map function applies a transformation to each element of the array and returns a new array with the transformed values. It also seems to make the adding of intervals onto the root note easier.
  let notes = intervals.map((interval) => rootNote + interval);

  let attack = midiNoteInput.attack; // Use velocity directly from input

  // Send each note of the chord to the output
  notes.forEach((note) => {
    myOutput.playNote(note, { attack: attack, duration: 0.5 });
  });

  // Return the notes to stop them later
  return notes;
};

// Initialize an array to keep track of active notes
let activeNotes = [];

// Add an event listener for the 'change' event on the input devices dropdown.
// This allows the script to react when the user selects a different MIDI input device.
dropInsIO.addEventListener("change", function () {
  // Before changing the input device, remove any existing event listeners
  // to prevent them from being called after the device has been changed.
  if (myInput.hasListener("noteon")) {
    myInput.removeListener("noteon");
  }
  if (myInput.hasListener("noteoff")) {
    myInput.removeListener("noteoff");
  }

  // Change the input device based on the user's selection in the dropdown.
  myInput = WebMidi.inputs[dropInsIO.value];

  // After changing the input device, add new listeners for 'noteon' and 'noteoff' events.
  // These listeners will handle MIDI note on (key press) and note off (key release) messages.
  myInput.addListener("noteon", function (someMIDI) {
    // When a note on event is received, send a note on message to the output device.
    // This can trigger a sound or action on the MIDI output device.
    let midiNoteOutput = midiProcess(someMIDI);
    // Add the notes to the activeNotes array
    activeNotes.push(...midiNoteOutput);
  });

  myInput.addListener("noteoff", function (someMIDI) {
    // Similarly, when a note off event is received, send a note off message to the output device.
    // This signals the end of a note being played.
    let midiNoteOutput = midiProcess(someMIDI);
    // Stop only the notes that were played
    midiNoteOutput.forEach((note) => {
      // this finds the index of the active notes that were put into the array activeNotes
      let index = activeNotes.indexOf(note);
      // !== is a strict inequality which seems like it does a better job at always seeing the different notes as different notes
      if (index !== -1) {
        myOutput.stopNote(note);
        // .splice is a method that removes or adds something from an array
        activeNotes.splice(index, 1); // Remove the note from activeNotes at the specified index that is being referened
      }
    });
  });
});

// Add an event listener for the 'change' event on the output devices dropdown.
// This allows the script to react when the user selects a different MIDI output device.
dropOutsIO.addEventListener("change", function () {
  // Change the output device based on the user's selection in the dropdown.
  // The '.channels[1]' specifies that the script should use the first channel of the selected output device.
  // MIDI channels are often used to separate messages for different instruments or sounds.
  myOutput = WebMidi.outputs[dropOutsIO.value].channels[1];
});
