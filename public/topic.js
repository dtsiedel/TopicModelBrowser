// Alex Van Heest
// Single Topic View

// Designed to display unary topic view of data.
// Meant to show a single topic through excerpts from a series of documents.

var per_page = 20;

// Finds most exemplary sentence from article for a given topic. Annotates as it processes each sentence, returns
// an output that includes three sentence-excerpt from the article.
function find_best_excerpt_from_selection(title, doc_number, percent_similarity, original_article, wordlist, link, topic, n)
{
    var split_list = original_article.match( /[^\.!\?]+[\.!\?]+/g )
    var kw_dict = {};

    //if there is only one line, just return that line
    if(split_list === null)
    {
        split_list = [original_article];
    }

    for (var k = 0; k < wordlist.length; k++)
    {
        kw_dict[wordlist[k]] = wordlist.length - k;
    }

    var best_total_wordcount = 0;
    var best_sentence_index = -1;
    var all_annotated_sentences = [];

    var current_total_wordcount = 0;

    // loop through the whole string, sentence by sentence
    for (var i = 0; i < split_list.length; i++)
    {
        // setup new annotations index
        all_annotated_sentences.push("");

        //current_total_unique_wordcount = 0;
        current_total_wordcount = 0;

        // split element split_list[i] of words into another array
        //var current_sentence_array = split_list[i].split(" ");
        var temp_par = split_list[i];

        var ea_word_in_current_sentence = split_list[i].split(" ");
        // loop through each word in the current sentence
        for (var j = 0; j < ea_word_in_current_sentence.length; j++)
        {
            var current_word_score = kw_dict[ea_word_in_current_sentence[j].toLowerCase()];
            if (current_word_score != null) // if current word is a keyword
            {
                current_total_wordcount += 1;

                // annotation:
                all_annotated_sentences[i] += "<span class=\"marked\"/>";
                all_annotated_sentences[i] += ea_word_in_current_sentence[j];
                all_annotated_sentences[i] += "</span> ";
            }
            else
            {
                // no annotation:
                all_annotated_sentences[i] += ea_word_in_current_sentence[j];
            }

            if (j + 1 < ea_word_in_current_sentence.length)
            {
                all_annotated_sentences[i] += " ";
            }
        }
        all_annotated_sentences[i] += " ";

        if (current_total_wordcount > best_total_wordcount)
        {
            best_total_wordcount = current_total_wordcount;
            best_sentence_index = i;
        }
    }

    // what we are left with is the index of the best fitting example for this topic, let's output it
    if (best_sentence_index == -1)  // this would mean nothing was found with > 0 unique / total words: handle with
                                    // explanatory output to HTML (note: in long term, we'd just ignore this case)
    {
        best_sentence_index = 0;
        all_annotated_sentences[0] = "<p>No sufficient matches found</p>";
        all_annotated_sentences[1] = null;
        all_annotated_sentences[2] = null;
        //return
    }

    var first = -1, second = -1, last = -1;
    // When we present the resulting excerpt, we want to show three sentences no matter where the excerpt is.
    if (best_sentence_index == split_list.length - 1)   // means it's first/last sentence
    {
        first = split_list.length - 3;
        second = split_list.length - 2;
        last = split_list.length - 1;
    }
    else if (best_sentence_index == 0)   // means it's first/last sentence
    {
        first = 0;
        second = 1;
        last = 2;
    }
    else
    {
        first = best_sentence_index - 1;
        second = best_sentence_index;
        last = best_sentence_index + 1;
    }

    // Edit display:
    d3.select("#chart-container").append("div").attr("id", "sample");
    document.getElementById("sample").innerHTML += "<h3 class='topic-match'>"+n+". <span class='topic-doc-link' onclick='loadDoc(" + doc_number.toString() + ")'>" + title + "</span>  <a class='outlink' target = '_blank' href='" + link + "'> [original article] </a></h3>";
    document.getElementById("sample").innerHTML += "<h5 class='topic-match'>" + percent_similarity.toString() + "% topic match</h5>";

    if(all_annotated_sentences[first])
    {
        document.getElementById("sample").innerHTML += "<span class='topic-match'>" + all_annotated_sentences[first] + "</span>";
    }
    if(all_annotated_sentences[second])
    {
        document.getElementById("sample").innerHTML += "<span class='topic-match'>" + all_annotated_sentences[second] + "</span>";
    }
    if(all_annotated_sentences[last])
    {
        document.getElementById("sample").innerHTML += "<span class='topic-match'>" + all_annotated_sentences[last] + "</span>";
    }

    d3.selectAll(".marked").style("background-color", colors[topic]);
}

// Given topic number, sets H2 in HTML to "TOPIC ###"
function define_topicname_from_url(topic, page_n)
{
    var topic_words = reverse_topic_indices[topic].split("_").join();
    d3.select("#chart-container").append("h2").attr("id", "topicname");
    document.getElementById("topicname").innerHTML = "Topic " + topic + " Summary (Page "+page_n+")<br/><h6>Sample words: " + topic_words + "</h6>";
    d3.select("#topicname").style("color", colors[topic]);
}

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructDonut function the first time
function setUpTopic(parameters, page)
{
    addCorpusLink(pages.topic);
    addNavButtons(parameters, page);
    define_topicname_from_url(parameters, page);
    constructTopic(parameters, per_page, page);
}

//actually make the physical representation of the topic
function constructTopic(topic, numDocs, page_n)
{
    document.title = "Topic " + topic;  
    var word_list = reverse_topic_indices[topic].split("_");
    var doc_list = ribbon_data[topic][topic];
    var values = [];
    var end = false;
    
    for(var i = 0; i < doc_list.length; i++)
    {
        var current = doc_list[i];
        var temp = [];
        temp[0] = current;
        temp[1] = csv_data[current][reverse_topic_indices[topic]];
        values.push(temp);
    }
    values.sort(function(x, y){return y[1] - x[1];});
    
    if(numDocs > values.length) 
    {
        numDocs = values.length;
    }
   
    if(page_n == maxPage(topic))
    {
        numDocs = doc_list.length % per_page;
        end = true; 
    }

    var start = (page_n-1) * numDocs;
    for(var i = start; i < start+numDocs; i++)
    {
        var this_doc = values[i];
        find_best_excerpt_from_selection(conditional_clip(document_text[this_doc[0]]["title"], 70), this_doc[0], (this_doc[1] * 100).toFixed(2), document_text[this_doc[0]]["text"], word_list, document_text[this_doc[0]]["url"], topic, i+1);
    }
    if(end)
    {
        document.getElementById("sample").innerHTML += "<br><br><h3>((END OF RESULTS))</h3></br></br>"
    }
}

//control next page logic
function pageNext(topic, current_page)
{
    if(current_page >= maxPage(topic))
        return;
    var target = parseInt(current_page)+1;
    topicCleanup();
    setUpTopic(topic, target);
}

//what is the highest number page you can get for the topic?
function maxPage(topic)
{
    var n_docs = ribbon_data[topic][topic].length;    
    return Math.ceil(n_docs / per_page);
}

//control last page logic
function pageLast(topic, current_page)
{
    if(current_page <= 1)
        return;
    var target = parseInt(current_page)-1
    topicCleanup();
    setUpTopic(topic, target);
}

//put the next/past buttons into the header
function addNavButtons(topic, current_page)
{
    d3.select("#header").append("button").attr("class", "nav-button last-button").text("Last Page").on("click", function() {pageLast(topic, current_page)});
    d3.select("#header").append("button").attr("class", "nav-button next-button").text("Next Page").on("click", function() {pageNext(topic, current_page)});
}

//remove all stuff we put on there
function topicCleanup()
{
    removeCorpusButton();
    removeOtherButtons();
    d3.select("#chart-container").remove();
    d3.select("#container").append("div").attr("id", "chart-container");
}

//remove the forward/backward buttons
function removeOtherButtons()
{
    d3.selectAll(".nav-button").remove();
}

//go to given document number
function loadDoc(n)
{
    goTo(pages.topic, pages.donut, n);
}

//wrapper to call data load functions
function topicMain(topic)
{
    setUpTopic(topic, 1); //eventually calling it just once will make it available to all views
}
