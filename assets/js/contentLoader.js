
// Use Fetch API to load content from the text file
fetch('topheader.html')
    .then(response => response.text())
    .then(content => {
        // Insert the content into the HTML element
        document.getElementById('TopHeaderContent').innerHTML = content;
    })
    .catch(error => console.error('Error loading content:', error));

// Use Fetch API to load content from the text file
fetch('NavBar.html')
    .then(response => response.text())
    .then(content => {
        // Insert the content into the HTML element
        document.getElementById('NavBarContent').innerHTML = content;
    })
    .catch(error => console.error('Error loading content:', error));

// Use Fetch API to load content from the text file
fetch('footer.html')
    .then(response => response.text())
    .then(content => {
        // Insert the content into the HTML element
        document.getElementById('footerContent').innerHTML = content;
    })
    .catch(error => console.error('Error loading content:', error));
