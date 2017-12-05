Lehigh CSE Senior Design Project, 2017
by Drew Siedel, Alexander Van Heest, Lena McDonnell
Advisor: Professor Eric Baumer (Lehigh DAS Lab)

The Topic Model Browser is a visualization tool for browsing topic models. A topic model is a clustering of words from an unlabeled corpus into discrete topics, as defined by co-occurrence of words. Social Scientists frequently encounter large corpora of such documents, and topic modeling is a great solution for gaining understanding of corpora with many thousands of documents. This browser allows non-technical users to interpret and utilize the results of a topic model on any text dataset.

The project uses R (with the RMallet package) to run a topic model on a dataset of 38,000+ blog posts made by family members of autistic children. A Node.js server processes the data and sends it to the client, where we use the Javascript library D3 to create our visualizations.


Check it out in action: https://www.youtube.com/watch?v=eOl93rVenhs
