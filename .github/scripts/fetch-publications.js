async function fetchPublications() {
  try {
    const scholarId = process.env.SCHOLAR_ID;
    const response = await fetch(
      `https://scholar.google.com/citations?user=${scholarId}&hl=de`,
      {
        headers: {
          'Accept-Charset': 'UTF-8',
          'Accept-Language': 'de-DE,de;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    );
    
    const html = await response.text();
    const $ = load(html, { decodeEntities: true });
    const publications = [];

    // Add delay between requests to avoid rate limiting
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (const elem of $('#gsc_a_b .gsc_a_tr').get()) {
      const titleElem = $(elem).find('.gsc_a_t a');
      const grayDivs = $(elem).find('.gsc_a_t .gs_gray');
      const yearElem = $(elem).find('.gsc_a_y');

      let year = yearElem.text().trim();
      const yearInVenue = $(elem).find('.gs_oph').text().trim();
      if (yearInVenue) {
        year = yearInVenue.replace(/,\s*/, '');
      }

      const title = titleElem.text().trim();
      const citationUrl = titleElem.attr('href');
      await delay(2000);
      const links = await getSourceLinks(citationUrl, title);

      let authors = $(grayDivs[0]).text().trim();
      authors = authors.split(', ').map(author => author.trim()).join(', ');

      // Clean up venue: remove trailing comma and [Google Scholar] text
      let venue = $(grayDivs[1]).text().trim()
        .replace(year, '')  // Remove year
        .replace(/\[Google Scholar\]/g, '')  // Remove [Google Scholar] text
        .replace(/,\s*$/, '')  // Remove trailing comma and spaces
        .trim();

      const publication = {
        title: title,
        scholarLink: 'https://scholar.google.com' + citationUrl,
        sourceLink: links.source,
        authors: authors,
        venue: venue,
        year: year,
      };

      publications.push(publication);
      console.log(`Processed: ${title} (Source: ${links.source})`);
    }

    const projectRoot = path.join(__dirname, '..', '..');
    const dataDir = path.join(projectRoot, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const jsonContent = JSON.stringify(publications, null, 2);
    fs.writeFileSync(
      path.join(dataDir, 'publications.json'),
      jsonContent,
      'utf8'
    );
    
    console.log(`Successfully fetched ${publications.length} publications`);
  } catch (error) {
    console.error('Error fetching publications:', error);
    process.exit(1);
  }
}

fetchPublications();
