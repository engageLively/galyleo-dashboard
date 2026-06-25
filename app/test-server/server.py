"""
Minimal local SDTP server for standalone editor testing.

Run:
    pip install sdtp flask-cors
    python server.py

Then set app/public/galyleo.config.json:
    { "publishServer": "", "tableServers": ["http://localhost:5000"] }
"""

from flask import Flask
from flask_cors import CORS
from sdtp import sdtp_server_blueprint, RowTable
from sdtp import SDML_STRING, SDML_NUMBER, SDML_DATE, SDML_BOOLEAN

app = Flask(__name__)
CORS(app)
app.register_blueprint(sdtp_server_blueprint)

# ── Sample tables ────────────────────────────────────────────────────────────

# Monthly sales by region — good for bar / column charts
sales = RowTable(
    [
        {"name": "month",  "type": SDML_STRING},
        {"name": "region", "type": SDML_STRING},
        {"name": "sales",  "type": SDML_NUMBER},
    ],
    [
        ["Jan", "North", 42000], ["Jan", "South", 31000], ["Jan", "West", 27000],
        ["Feb", "North", 38000], ["Feb", "South", 29000], ["Feb", "West", 33000],
        ["Mar", "North", 51000], ["Mar", "South", 44000], ["Mar", "West", 39000],
        ["Apr", "North", 47000], ["Apr", "South", 36000], ["Apr", "West", 41000],
        ["May", "North", 55000], ["May", "South", 48000], ["May", "West", 45000],
        ["Jun", "North", 60000], ["Jun", "South", 52000], ["Jun", "West", 49000],
    ],
)

# Daily temperature readings — good for line / area charts
temperatures = RowTable(
    [
        {"name": "date",      "type": SDML_DATE},
        {"name": "city",      "type": SDML_STRING},
        {"name": "high_f",    "type": SDML_NUMBER},
        {"name": "low_f",     "type": SDML_NUMBER},
        {"name": "precip_in", "type": SDML_NUMBER},
    ],
    [
        ["2024-06-01", "Oakland",   68, 54, 0.0],
        ["2024-06-01", "Austin",    95, 74, 0.1],
        ["2024-06-01", "Chicago",   78, 62, 0.3],
        ["2024-06-02", "Oakland",   70, 55, 0.0],
        ["2024-06-02", "Austin",    98, 76, 0.0],
        ["2024-06-02", "Chicago",   82, 65, 0.0],
        ["2024-06-03", "Oakland",   65, 52, 0.2],
        ["2024-06-03", "Austin",    91, 72, 0.4],
        ["2024-06-03", "Chicago",   75, 60, 0.1],
        ["2024-06-04", "Oakland",   72, 57, 0.0],
        ["2024-06-04", "Austin",    93, 75, 0.0],
        ["2024-06-04", "Chicago",   80, 63, 0.0],
        ["2024-06-05", "Oakland",   69, 53, 0.1],
        ["2024-06-05", "Austin",    96, 77, 0.2],
        ["2024-06-05", "Chicago",   77, 61, 0.5],
    ],
)

# Survey responses — good for pie / donut charts and filters
survey = RowTable(
    [
        {"name": "respondent", "type": SDML_STRING},
        {"name": "age_group",  "type": SDML_STRING},
        {"name": "score",      "type": SDML_NUMBER},
        {"name": "satisfied",  "type": SDML_BOOLEAN},
        {"name": "date",       "type": SDML_DATE},
    ],
    [
        ["Alice",   "18-34", 82, True,  "2024-01-15"],
        ["Bob",     "35-54", 74, True,  "2024-01-16"],
        ["Carol",   "55+",   91, True,  "2024-01-17"],
        ["Dave",    "18-34", 55, False, "2024-01-18"],
        ["Eve",     "35-54", 68, True,  "2024-01-19"],
        ["Frank",   "55+",   43, False, "2024-01-20"],
        ["Grace",   "18-34", 77, True,  "2024-01-21"],
        ["Heidi",   "35-54", 85, True,  "2024-01-22"],
        ["Ivan",    "55+",   62, True,  "2024-01-23"],
        ["Judy",    "18-34", 39, False, "2024-01-24"],
        ["Karl",    "35-54", 71, True,  "2024-01-25"],
        ["Laura",   "55+",   88, True,  "2024-01-26"],
        ["Mallory", "18-34", 51, False, "2024-01-27"],
        ["Niaj",    "35-54", 79, True,  "2024-01-28"],
        ["Olivia",  "55+",   94, True,  "2024-01-29"],
    ],
)

if __name__ == '__main__':
    for entry in [
        {"name": "sales",        "table": sales},
        {"name": "temperatures", "table": temperatures},
        {"name": "survey",       "table": survey},
    ]:
        sdtp_server_blueprint.table_server.add_sdtp_table(entry)

    print("SDTP test server running at http://localhost:5000")
    print("Tables: sales, temperatures, survey")
    app.run(debug=True, port=5000)
