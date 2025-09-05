# Poll & Voting App
<br>

## ABSTRACT
The Polls and Voting Web Application is an online platform that allows users to create polls and cast votes online without needing a physical voting booth. This system provides an easy, secure, and reliable way of conducting polls and elections digitally.

Users can register and log in to participate. The system administrator has the authority to manage polls, monitor votes, and ensure secure usage. Each user is given a unique account through which they can access the system and cast their vote. The system ensures that a user can vote only once per poll.
<br>
<br>

## INTRODUCTION
The Polls and Voting Web Application is designed to make voting easier, faster, and more transparent. Instead of conducting votes manually, this web-based system allows users to participate in polls from anywhere using their computer or mobile device.

The system is built using HTML, CSS, JavaScript for the frontend, and Flask (Python) for the backend with SQLite as the database. It ensures secure login, user-friendly interfaces, and prevents duplicate voting.

This application can be used in:

Online surveys

Opinion polls

Decision-making within organizations

It is a lightweight, secure, and customizable system that can be easily deployed locally or on a server.
<br>
<br>
## SOFTWARE REQUIREMENTS

Operating System: Windows / macOS / Linux

Frontend:
HTML5,
CSS3,
JavaScript

Backend: Python (Flask Framework)

Database: SQLite
<br>
<br>
## INSTALLATION 

**Download Project Files**

&nbsp;&nbsp;Download the project zip file and extract it.

**Install Python (if not already installed)**

&nbsp;&nbsp;Download Python
&nbsp;&nbsp;&nbsp; (version 3.8 or above).

**Install Required Dependencies**

Open terminal / command prompt in the project folder.

Run: <br>
   &nbsp;&nbsp;&nbsp;  **pip install flask**<br>
   &nbsp;&nbsp;&nbsp;  **pip install flask_sqlalchemy** <br>
   <br>
**Database Setup**

Ensure the templates/ and static/ folders exist in the project.

The database polls.db (SQLite) will be auto-created when the app runs.

If not, you can initialize it manually by running: <br>
 &nbsp;&nbsp;&nbsp; python app.py

Run the Application

 &nbsp;&nbsp;In terminal, run:
  &nbsp;&nbsp; &nbsp;&nbsp;python app.py

 &nbsp;&nbsp;Open browser and go to:
 &nbsp;&nbsp; &nbsp;&nbsp;http://127.0.0.1:5000/

## PROJECT STRUCTURE

polls-voting-app/ <br>
│── app.py        &nbsp;&nbsp; &nbsp;&nbsp;        # Main Flask application  <br>
│── polls.db         &nbsp;&nbsp; &nbsp;&nbsp;     # SQLite Database (auto-created)<br>
│── static/         &nbsp;&nbsp; &nbsp;&nbsp;      # CSS, JS, Images<br>
│── templates/     &nbsp;&nbsp; &nbsp;&nbsp;       # HTML files<br>
│── requirements.txt   &nbsp;&nbsp; &nbsp;&nbsp;   # Required packages<br>

 <br>
 <br>
 
