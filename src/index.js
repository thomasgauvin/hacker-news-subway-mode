// Are you ever on the subway with intermittent internet and you want to read hacker news?
// Bored in between stations and want to get up to date on the latest discussions?
// This is the project for you!

// This is a project that will prefetch all links on the Hacker News homepage.
// It is a proxy to the official hacker news site, but with the added benefit of prefetching all links on the homepage.

// This project uses Cloudflare Workers to intercept requests to the Hacker News homepage and prefetch all links on the page.
// This means that when you click on a link, the page will load instantly, even if you are in a subway with no internet connection.

// The project uses the Cloudflare Workers KV store to cache the pages and serve them as well to reduce the load on Hacker News.

//This is a proxy for Hacker News which will prefetch all links on the homepage
export default {

	//this is the worker that will run on every request and fetch the hacker news page assets
	//it will pull these assets from KV if they exist
	//if they don't exist, it will fetch the assets from the hacker news page
	async fetch(request, env, ctx) {
		//write a proxy for hacker news
		const url = new URL(request.url);
		url.port = '';
		url.hostname = 'news.ycombinator.com';
		url.protocol = 'https';

		let response;
		//get the page in the KV cache, and serve it if it is less than 5 minutes old
		response = await returnFromKVOrFetchFromOrigin(env, url, request);

		response = addPrefetchLinksScriptToHomePage(url, response);

		response = addPageTitleToHomePage(url, response);

		return response;
	},
};

function isHomePage(url){
	return url.toString() === 'https://news.ycombinator.com' || url.toString() === 'https://news.ycombinator.com/' || url.toString() === 'https://news.ycombinator.com/news';
}

function addPageTitleToHomePage(url, response) {
	if (isHomePage(url)) {
		//use HTMLRewriter to add (subway mode) to the <a href="news">Hacker News</a>
		return new HTMLRewriter()
			.on('a', {
				element(el) {
					if (el.getAttribute('href') === 'news') {
						el.append(' (subway mode)');
					}
				},
			})
			.transform(response);
	}

	return response;
}

function addPrefetchLinksScriptToHomePage(url, response) {
	// if the path is /, prefetch all links in page
	if(isHomePage(url)){
		console.log("Found the homepage, prefetching links");

		return new HTMLRewriter()
			.on('body', {
				element(el){
					el.append(returnAddPrefetchLinksScript(), { html: true });
				}
			})
			.transform(response);
	}
	return response;
}

async function returnFromKVOrFetchFromOrigin(env, url, request) {
	let response = await returnFromKV(env, url);
	if (!response){
		response = await fetchFromOriginAndStoreInKV(env, url, request);
	}

	return response;
}

async function fetchFromOriginAndStoreInKV(env, url, request) {
	const response = await fetch(url.toString(), request);

	const bodyStream = response.clone().body;

	//store the response in KV
	await env.hnSubwayModeKV.put(url.toString(), bodyStream, {
		metadata: {
			timestamp: Date.now(),
			options: {
				status: response.status,
				statusText: response.statusText,
				headers: JSON.stringify({
					...Object.fromEntries(response.headers),
					'cache-control': 'public, max-age=300, stale-while-revalidate',
				}),
			},
		},
	});

	console.log('Obtained response from origin for ' + url.toString());
	console.log('Stored response in KV for ' + url.toString());

	return response;
}

async function returnFromKV(env, url) {
	
	try{
		let kvObj = await env.hnSubwayModeKV.getWithMetadata(url.toString());
		if (kvObj && kvObj.metadata && kvObj.metadata.options && kvObj.metadata.timestamp > Date.now() - 5 * 60 * 1000) {
			console.log('Obtained response from KV for ' + url.toString());

			const response = new Response(kvObj.value, {
				status: kvObj.metadata.options.status,
				statusText: kvObj.metadata.options.statusText,
				headers: new Headers({
					...JSON.parse(kvObj.metadata.options.headers),
					'cache-control': 'public, max-age=300, stale-while-revalidate, stale-if-error=86400',
				}),
			});

			return response;
		}

		if (kvObj && kvObj.metadata && kvObj.metadata.timestamp < Date.now() - 5 * 60 * 1000) {
			console.log('Obtained response from KV for ' + url.toString() + ' but it was too old');
		}
		else{
			console.log('No response in KV for ' + url.toString());
		}
	}
	catch(e){
		console.log(e);
	}

	return null;
}

function returnAddPrefetchLinksScript(){
	return `<script>
function addPrefetchLinks() {
  // Get the current URL
  const currentURLWithoutPath = window.location.protocol + '//' + window.location.host;

  // Get all <a> tags in the document
  const anchorTags = document.querySelectorAll('a');

  // Filter and collect eligible links
  const links = Array.from(anchorTags)
    .map(a => a.href.trim())
    .filter(href => {
      return href.startsWith((currentURLWithoutPath + '/item') || href.startsWith('https://') || href.startsWith('http://'));
    });

	console.log(links);

  // Remove duplicate links
  const uniqueLinks = [...new Set(links)];

  // Define a function to add prefetch link with delay
  function addLinkWithDelay() {
    // If there are no more links, stop adding links
    if (uniqueLinks.length === 0) {
      clearInterval(intervalId); // Stop the interval
      return;
    }

    // Get the next link to add
    const href = uniqueLinks.shift();

    // Create a prefetch link element
    const prefetchLink = document.createElement('link');
		prefetchLink.rel = 'prefetch';
		prefetchLink.as = 'document';
    // prefetchLink.rel = 'preload';
		// prefetchLink.crossOrigin = 'true';
		// prefetchLink.as = 'fetch';
    prefetchLink.href = href;

    // Add the prefetch link element to the head of the document
    document.head.appendChild(prefetchLink);

		setTimeout(() => {
			const responseStatus = performance.getEntriesByName(href)[0].responseStatus;

			// Find all anchor tags with matching href
   		const matchingAnchorTags = [...anchorTags].filter(a => a.href.trim() === href);

			if (responseStatus >= 200 && responseStatus < 300 || !responseStatus) {
				// Change the color of the matching anchor tags to dark orange
				matchingAnchorTags.forEach(matchingAnchorTag => {
					matchingAnchorTag.style.color = '#824800'; // Dark orange color

					// Append the superscript to indicate availability
					var superscript = document.createElement('sup');
					superscript.style.fontSize = '0.6em';
					superscript.textContent = '•'; // Use bullet point as superscript
					matchingAnchorTag.appendChild(superscript);
				});
			}

		}, 1000);
  }

  // Call addLinkWithDelay initially
  addLinkWithDelay();

  // Set interval to call addLinkWithDelay every 1000 milliseconds (1 second)
  const intervalId = setInterval(addLinkWithDelay, 1000);
}

addPrefetchLinks();
</script>`;
}