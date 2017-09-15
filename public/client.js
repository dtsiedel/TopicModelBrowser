function main()
{
    //need some data to represent
    var data = [{year: 2006, books: 54, bar_color:"cyan", text_color:"red"},
                {year: 2007, books: 43, bar_color:"red", text_color:"cyan"},
                {year: 2008, books: 41, bar_color:"cyan", text_color:"red"},
                {year: 2009, books: 44, bar_color:"red", text_color:"cyan"},
                {year: 2010, books: 35, bar_color:"cyan", text_color:"red"},
                {year: 2011, books: 12, bar_color:"red", text_color:"cyan"}];

    //variables to control the graph result
    var barWidth = 40;
    var width = (barWidth + 10) * data.length;
    var height = 200;

    //create scales for both the x and y axes - these map a value from the input range to an output range
    var x = d3.scaleLinear().domain([0, data.length]).range([0, width]);
    var y = d3.scaleLinear().domain([0, d3.max(data, function(datum) { return datum.books; })]).rangeRound([0, height]);

    // add the canvas to the DOM 
    var barDemo = d3.select("#bar-demo").append("svg:svg").attr("width", width).attr("height", height);

    //use jquery-style selector to apply this stuff to every rectangle 
    //the .enter() function means that all of the things after it are applied when
    //a new data element is added to the display
    barDemo.selectAll("rect").
        data(data).
        enter().
        append("svg:rect").
        attr("class", "bar").
        attr("x", function(datum, index) { return x(index); }).
        attr("y", function(d) { return y(d.books) + height; }).
        attr("height", 0).
        attr("width", barWidth).
        attr("fill", function(d) { return d.bar_color; }).
        transition().
        duration(500).
        attr("y", function(d) { return height - y(d.books); }).
        attr("height", function(d) { return y(d.books); }).
        on("end", add_text);


	function add_text()
	{
	    //similar styling for text
	    barDemo.selectAll("text").
		data(data).
		enter().
		append("svg:text").
		attr("class", "bar-label").
		attr("x", function(datum, index) { return x(index) + barWidth; }).
		attr("y", function(datum) { return height - y(datum.books); }).
		attr("dx", -barWidth/2).
		attr("dy", "1.2em").
		attr("text-anchor", "middle").
		text(function(datum) { return datum.books;}).
		attr("fill", function(d) { return d.text_color; });
	}

    //toggle bar color
    barDemo.selectAll("rect").on("click", function(d, i){
        var current = d3.select(this);
        var color = current.data()[0].bar_color;
        if(color === "cyan")
        { 
            current.transition().duration(500).attr("fill", "red");
            current.data()[0].bar_color = "red";
        } 
        else 
        {
            current.transition().duration(500).attr("fill", "cyan");
            current.data()[0].bar_color = "cyan";
        }
        toggle_text(i);
    });

    //given an i, toggles the text of that i
    function toggle_text(desired) {
        d3.selectAll("text").each(function(d, i) { 
            if(i === desired) {
                var color = d.text_color;
                var current = d3.select(this);
                if(color === "cyan")
                {
                    current.transition().duration(500).attr("fill", "red");
                    current.data()[0].text_color = "red";
                }
                else
                {
                    current.transition().duration(500).attr("fill", "cyan");
                    current.data()[0].text_color = "cyan";
                }
                return false; //don't run through all i if you've already reached it
            }
        });
    }
}
