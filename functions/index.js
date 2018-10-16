// Copyright 2018, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

// Import the Dialogflow module from the Actions on Google client library.
const {
	dialogflow,
	Suggestions,
	SignIn,
} = require('actions-on-google');

// Import the firebase-functions package for deployment.
const functions = require('firebase-functions');
const firebaseAdmin = require('firebase-admin');
firebaseAdmin.initializeApp(functions.config().firebase); 
var db = firebaseAdmin.database()
var usersRef = db.ref("users");


// Instantiate the Dialogflow client.
const app = dialogflow({
	clientId: '564723092889-tjt0efpacsr065svnv2doegcsf5evj55.apps.googleusercontent.com',
	debug: true
});

var question = {
	"cricket" : [
		{
	        "question_en": "Which of these cricketers is a participant on Bigg Boss 12?",
	        "options_en": [
	            "Harbhajan Singh",
	            "S. Sreesanth",
	            "Hardik Pandya"
	        ],
	        "id":1,
	        "ans":"S. Sreesanth"
	    },
	    {
	        "question_en": "Which of these players has captained India in ODIs?",
	        "options_en": [
	            "Virender Sehwag",
	            "Marvan Atapattu",
	            "Rashid Khan"
	        ],
	        "id":2,
	        "ans":"Virender Sehwag"
	 	},
	 	{
            "question_en": "Which team made its Indian domestic cricket debut in 2018?",
            "options_en": [
                "Puducherry",
                "Mumbai",
                "Karnakata"
            ],
            "id":3,
	        "ans":"Mumbai"
        },
        {
			"question_en": "Which of these countries has Eknath Solkar represented in ODIs?",
            "options_en": [
                "West Indies",
                "India",
                "Ireland"
            ],
            "id":4,
	        "ans":"West Indies"
        },
        {
			"question_en": "Who has captained his team for the most number of matches in ICC World T20 history?",
            "options_en": [
                "MS Dhoni",
                "Kumar Sangakkara",
                "Michael Clarke"
            ],
            "id":5,
	        "ans":"MS Dhoni"
        }
	],
	"football" : [
		{
			"question_en": "Who in 1934 became the first African nation to play at a World Cup?",
            "options_en": [
                "Nigeria",
                "Eqypt",
                "Senegal"
            ],
            "id":1,
	        "ans":"Eqypt"
        },
        {
			"question_en": "The 1962 World Cup in Chile was the first to use what system as the primary means of separating two teams on the same amount of points?",
            "options_en": [
                "Goal average",
                "Goal Difference",
                "Drawing of straws"
            ],
            "id":2,
	        "ans":"Goal average"
        },
        {
			"question_en": "How old was legendary goalkeeper Dino Zoff when he won the World cup with Italy in 1982?",
            "options_en": [
                "39",
                "40",
                "48"
            ],
            "id":3,
	        "ans":"40"
        },
        {
			"question_en": "Mexico stepped in to host the 1986 World Cup instead of whom?",
            "options_en": [
                "Paraguay",
                "Argentina",
                "Columbia"
            ],
            "id":4,
	        "ans":"Columbia"
        },
        {
			"question_en": "Who were the only nation to remain unbeaten throughout the 2010 World Cup?",
            "options_en": [
                "Spain",
                "Germany",
                "New Zealand"
            ],
            "id":5,
	        "ans":"New Zealand"
        }
	]
}

var questions_copy;
var game_type;

app.intent('start_game', (conv,param) => {

	console.log({
		intent : 'start_game',
		param : JSON.stringify(param) 
	})

	console.log({
		intent : 'start_game',
		conv : JSON.stringify(conv.data) 
	})

	game_type = param['game-choice'] ? param['game-choice'] : game_type;   

	conv.data.game.type = game_type

	if(!questions_copy){

		questions_copy = Object.assign([],question[game_type])		
	}

	let q = questions_copy.pop();

	let q_string = q.question_en

	conv.data.game.id = q.id;
	conv.data.game.ans = q.ans;

	conv.ask(q_string);

	if(q && q.options_en){

		conv.ask(new Suggestions(q.options_en))
	}  
});

app.intent('provide_ans',(conv,param) => {

	console.log({
		intent : 'provide_ans',
		ans : param['ans'][0]
	})

	console.log({
		intent : 'provide_ans',
		conv_data : JSON.stringify(conv.data) 
	})


	let ans = param['ans'][0];


	var current_q;


	if(conv.data.game.ans == ans){

		conv.data.user.score.current = conv.data.user.score.current + 1
		conv.data.user.score.over_all = conv.data.user.score.over_all + 1 			 			
		
	}
	
	if(questions_copy && questions_copy.length > 0){		
		
		let q = questions_copy.pop();
		
		let q_string = q.question_en
		
		conv.ask(q_string);
		
		conv.data.game.ans = q.ans;

		if(q && q.options_en){
			conv.ask(new Suggestions(q.options_en))
		}  

	}else{
		
		var scoreUpdate = usersRef.child(conv.user.profile.payload.sub);
		scoreUpdate.update({
		  "score": conv.data.user.score.over_all
		});

		questions_copy = undefined
		conv.close(`Player 
			${conv.user.profile.payload.name},
			${conv.data.user.score.current} is your current score, 
			over all score is ${conv.data.user.score.over_all}, 
			good game!`
		);
	}
})


app.intent('Default Welcome Intent', (conv) => {

  	questions_copy = undefined
  	
  	conv.data.user = {
		score: {
			current : 0
		}
	}
	conv.data.game = {}

	conv.ask(new SignIn('To get your account details'))

  	
});


app.intent('get_signin', (conv, params, signin) => {
  	
  	questions_copy = undefined

  	if (signin.status === 'OK') {
  		return new Promise(function(resolve,reject){
  			const payload = conv.user.profile.payload
	  		console.log(payload)
			usersRef.child(payload.sub).once("value", function(snapshot) {
				var userData = snapshot.val();

				if(!userData){
					
					usersRef.child(payload.sub).set({
						'name' : payload.name,
						'email' : payload.email,
						'score' : 0
					});	

				}else{

					console.log(userData)

					conv.data.user.score.over_all =  parseInt(userData.score)

					conv.ask(`Welcome to the Quiz Master, ${payload.name}. Shall we begin? Please select sport: Cricket or Football`)

					conv.ask(new Suggestions(["cricket","football"]))

				}
				
				resolve()

			}, function (errorObject) {
				console.log("The read failed: " + errorObject.code);
    			conv.close(`Opps , I ran into some problem`)
				resolve()
			});
	
  		})
	      
  } else {

    conv.close(`I won't be able to save your data , you can proceed`)
  }
})


// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
