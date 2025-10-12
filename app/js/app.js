document.addEventListener("DOMContentLoaded", () => {
  //Burger menu
  const burger = document.querySelector(".burger");
  const menu = document.querySelector(".header_menu");

  burger.addEventListener("click", () => {
    burger.classList.toggle("active");
    menu.classList.toggle("open");
  });

  //Custom Select
  document
    .querySelector(".custom-select_input")
    .addEventListener("click", function () {
      document.querySelector(".custom-select_options").style.display = "block";
    });

  document
    .querySelector(".custom-select_options")
    .addEventListener("click", function (event) {
      if (event.target.tagName === "LI") {
        document.querySelector(".custom-select_input").value =
          event.target.textContent;
        document.querySelector(".custom-select_options").style.display = "none";
      }
    });

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".custom-select")) {
      document.querySelector(".custom-select_options").style.display = "none";
    }
  });

  //File-upload
  const fileInput = document.getElementById("file");
  const fileName = document.querySelector(".file-name");

  fileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
      fileName.textContent = this.files[0].name;
    } else {
      fileName.textContent = "";
    }
  });

  //Progress Slider
  const bar = document.getElementById("progress-bar");
  const fill = document.getElementById("progress-fill");
  const thumb = document.getElementById("progress-thumb");
  const label = document.getElementById("progress-percent");
  const hiddenInput = document.getElementById("progress-input");

  let dragging = false;

  function setProgress(percent) {
    percent = Math.min(100, Math.max(0, percent));
    fill.style.width = percent + "%";
    thumb.style.left = percent + "%";
    label.textContent = percent + "%";
    hiddenInput.value = percent;
  }

  function updateProgressFromEvent(e) {
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.round((x / rect.width) * 100);
    setProgress(percent);
  }

  bar.addEventListener("mousedown", (e) => {
    dragging = true;
    updateProgressFromEvent(e);
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    updateProgressFromEvent(e);
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
  });

  // Touch support
  bar.addEventListener("touchstart", (e) => {
    dragging = true;
    updateProgressFromEvent(e.touches[0]);
  });

  window.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    updateProgressFromEvent(e.touches[0]);
  });

  window.addEventListener("touchend", () => {
    dragging = false;
  });

  setProgress(50);
});
