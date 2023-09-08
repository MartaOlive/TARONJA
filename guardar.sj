event.preventDefault();
			 var tableResults = [];
			 var rows = table.rows.length;
			 if (row > 1) {
			 	for (var r = 0; r < rows; r++) {
			 		var property = document.getElementById("tr_"+nodeId+"_"+(a+1)+"_property");
			 		var propertyText=property.text();
			 		var value = document.getElementById("tr_"+nodeId+"_"+(a+1)+"_value");
			 		var propertyText=property.text();

			 		tableResults.push(propertyText);
			 		tableResults.push(valueText);
			 	}

			 }
			 var selector1 = document.getElementById("selector" + type);
			 var selector3 = document.getElementById("selector" + type + "2");
			 tableResults.push(selector1.options[selector1.selectedIndex].value);
			 tableResults.push(selector3.options[selector3.selectedIndex].value);

			
			 var table = document.getElementById("tableResult");
			 var tableTr = document.createElement("tr");
			 tableTr.setAttribute("id", "tableTr" + valueButtonInt);
			 tableTr.setAttribute("class", "borderTable");
			 table.appendChild(tableTr);
             