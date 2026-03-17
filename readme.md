Node.js Machine Test (1 Hour) 

Please read the instructions carefully before starting. 

You are free to use any libraries or tools. The goal is to evaluate problem solving, code quality, correctness, and engineering decisions, not just whether the API runs. 

Use Node.js with Express.js for the server. 

General Expectations 

We will evaluate: 

Code structure & readability 

Handling of edge cases 

Correctness of logic 

Concurrency & data safety awareness 

API design & status codes 

How you would scale this in real production 

You may store data in memory unless you prefer a database. 

Submission Instructions 

Please provide: 

Source code 

Steps to run the project 

Any assumptions made 

 

 

Log Aggregation with Time Window 

Store incoming user activity logs and build an API to return the count of unique users active in the last N minutes. The solution should be efficient and avoid unbounded memory growth. 

Log format 

{ "userId": number, "timestamp": number } 

APIs to implement 

POST /logs[Text Wrapping Break]GET  /active-users?minutes=N 

POST /logs 

Store the incoming log entry. 

GET /active-users 

Return the count of unique users active within the last N minutes from the current server time. 

Requirements 

Avoid unbounded memory growth. 

Efficient for frequent queries. 

Handle invalid inputs. 

Bonus discussion after implementation 

Be ready to explain: 

How would this system work if logs were millions per minute? 

 

 