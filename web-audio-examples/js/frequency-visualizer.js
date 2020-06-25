let is_waiting_for_sync = true;
let a_count = 0;
let b_count = 0;

(function () {
  function FrequencyVisualizer(audioContext, canvasElement) {
    this.analyserNode = audioContext.createAnalyser();
    this.analyserNode.fftSize = 512;
    this.analyserNode.smoothingTimeConstant = 0.05;
    console.log(this.analyserNode);
    this.fftData = new Float32Array(this.analyserNode.frequencyBinCount);

    this.graphicWidth = parseInt(getComputedStyle(canvasElement).width, 10);
    this.graphicHeight = parseInt(getComputedStyle(canvasElement).height, 10);
    this.result = document.getElementById("result");

    var gc = this.graphicContext = canvasElement.getContext("2d");
    gc.fillStyle = '#000000';
    gc.strokeStyle = '#c0c0c0';

    this.gain = 0;
    this.stopping = false;

    setInterval(function () { this.draw(); }.bind(this), 10);
    this.draw();
  }

  FrequencyVisualizer.prototype.acceptConnection = function (connectedNode) {
    connectedNode.connect(this.analyserNode);
    this.connectedNode = connectedNode;
  };

  FrequencyVisualizer.prototype.draw = function () {
    if (this.stopping) {
      this.stopping = false;
      return;
    }

    var gc = this.graphicContext;
    var gw = this.graphicWidth;
    var gh = this.graphicHeight;

    gc.fillRect(0, 0, gw, gh);

    if (this.connectedNode) {
      var i, x, y;
      var scale = gh / 80;

      this.analyserNode.getFloatFrequencyData(this.fftData);

      // let max_i = -1;
      // let max_val = -10000;
      // for (i = 100; i < gw; i++) {
      //   if (this.fftData[i] > max_val) {
      //     max_val = this.fftData[i];
      //     max_i = i;
      //   }
      // }

      let ref1 = Math.max(this.fftData[210] + 100, 0.1);
      let a    = Math.max(this.fftData[215] + 100, 0.1);
      let ref2 = Math.max(this.fftData[220] + 100, 0.1);
      let b    = Math.max(this.fftData[226] + 100, 0.1);

      let is_a_on = (a - (ref1 + ref2) / 2) > 15;
      let is_b_on = (b - (ref1 + ref2) / 2) > 15;

      // if (!is_waiting_for_sync) {
        if (is_a_on != is_b_on) {
          // if (this.result.innerText.length % 21 == 0) {
          //   this.result.innerText += "\n";
          // }
          // this.result.innerText += is_a_on ? "1" : "0";
          if (is_a_on)
            a_count++;
          else
            b_count++;
          // is_waiting_for_sync = true;
        }
      // } else {
        else if (is_a_on && is_b_on) {
          if ((a_count + b_count) > 0 && Math.abs(a_count - b_count) > 5) {
            if (this.result.value.length % 21 == 0) {
              this.result.value += "\n";
            }
            this.result.value += (a_count > b_count) ? "1" : "0";
            console.log(a_count, b_count);
            a_count = 0;
            b_count = 0;
          }
          // is_waiting_for_sync = false;
        }
      // }

      // this.result.innerText = `A: ${is_a_on}\nB: ${is_b_on}\nMax: ${max_i}: ${max_val.toFixed(2)}`;

      for (i = 0; i < gw; ++i) {
        y = -(this.fftData[i] + this.gain + 15) * scale;

        gc.beginPath();
        gc.moveTo(i + 0.5, gh);
        gc.lineTo(i + 0.5, y);
        gc.stroke();
      }
    }


    // this.animationHandle = requestAnimationFrame(function () { this.draw(); }.bind(this));
  };

  FrequencyVisualizer.prototype.releaseConnection = function () {
    this.connectedNode.disconnect(this.analyserNode);
    delete this.connectedNode;
  };

  FrequencyVisualizer.prototype.stop = function () {
    this.stopping = true;
  };

  window.App = window.App || {};
  window.App.FrequencyVisualizer = FrequencyVisualizer;
})();


const hsync_sym = "10";
const sync_sym = "1010";
const esc_sym = "0011";
const sync_sym_regex = /1010/g;
const esc_sym_regex = /0011/g;
const esc_sync_sym_regex = /00111010/g;
const esc_hsync_sym_regex = /001111/g;

function decode(data) {
  let chunks = data.replace(esc_hsync_sym_regex, "h").replace(esc_sync_sym_regex, "s").split(sync_sym)
  let rest = chunks.pop().replace("h", hsync_sym).replace("s", sync_sym);
  let out = [];
  for (let chunk of chunks) {
    out.push(chunk.replace("h", hsync_sym).replace("s", sync_sym));
  }
  return [out, rest];
}

function decode_text() {
  let d = decode(document.getElementById("result").value.replace(/\n/g, ""));
  document.getElementById("result").value = d[1];
  document.getElementById("payloads").value += d[0].join("\n") + "\n";
}

function check_parities() {
  let payloads = document.getElementById("payloads").value.split("\n").filter((s) => s.length > 2);
  let checked_payloads = [];
  for (let payload of payloads) {
    payload = payload.split("");
    let p1 = payload.shift() == "1";
    let p0 = payload.shift() == "1";
    let parity = payload.filter((c) => c == "1").length;
    if ((p1 == (((parity / 2) % 2) != 0)) && (p0 == ((parity % 2) != 0))) {
      checked_payloads.push(payload.join(""));
    } else {
      console.log(`FAILED PARITY: (expected: ${(((parity / 2) % 2) != 0)?"1":"0"}${((parity % 2) != 0)?"1":"0"}) (got: ${p1?"1":"0"}${p0?"1":"0"}) - ${payload.join("")}`);
    }
  }
  document.getElementById("checked_payloads").value += checked_payloads.join("\n") + "\n";
}