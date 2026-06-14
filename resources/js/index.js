(function () {
	window.renderFooter({ active: "home" });

	const startButton = document.getElementById("start-new-plant-btn");
	if (!startButton) {
		return;
	}

	startButton.addEventListener("click", async () => {
		startButton.disabled = true;
		try {
			await window.PaperGardenSessionStore.startNewSession({
				batchSize: 10,
				newTarget: 5,
			});
			window.location.href = "seeding.html";
		} catch (error) {
			startButton.disabled = false;
			console.error(error);
		}
	});
})();
