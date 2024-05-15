function addPrefetchLinks() {
	// Get the current URL
	const currentURLWithoutPath = window.location.protocol + '//' + window.location.host;

	// Get all <a> tags in the document
	const anchorTags = document.querySelectorAll('a');

	// Filter and collect eligible links
	const links = Array.from(anchorTags)
		.map((a) => a.href.trim())
		.filter((href) => {
			return (
				(href.startsWith('https://') || href.startsWith('http://')) &&
				(!href.startsWith(currentURLWithoutPath) || href.startsWith(currentURLWithoutPath + '/item'))
			);
		});

	// Define a function to add prefetch link with delay
	function addLinkWithDelay() {
		// If there are no more links, stop adding links
		if (links.length === 0) {
			clearInterval(intervalId); // Stop the interval
			return;
		}

		// Get the next link to add
		const href = links.shift();

		// Create a prefetch link element
		const prefetchLink = document.createElement('link');
		prefetchLink.rel = 'prefetch';
		prefetchLink.href = href;

		// Add the prefetch link element to the head of the document
		document.head.appendChild(prefetchLink);
	}

	// Call addLinkWithDelay initially
	addLinkWithDelay();

	// Set interval to call addLinkWithDelay every 1000 milliseconds (1 second)
	const intervalId = setInterval(addLinkWithDelay, 1000);
}

addPrefetchLinks();