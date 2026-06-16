"""
Local SDTP development server for galyleo-dashboard.

Usage:
    pip install sdtp flask flask-cors
    python server.py

Serves at http://localhost:5001
"""
from pathlib import Path
from json import load

from flask import Flask
from flask_cors import CORS
from sdtp import sdtp_server_blueprint

app = Flask(__name__)
CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'
app.register_blueprint(sdtp_server_blueprint)

TABLES_DIR = (
    Path(__file__).parent.parent.parent
    / 'sdtp-examples' / 'simple-table-example' / 'server' / 'tables'
)

def _load_tables():
    for sdml_path in sorted(TABLES_DIR.glob('*.sdml')):
        with open(sdml_path) as f:
            table_dict = load(f)
        stem = sdml_path.stem

        # Register under the simple stem name
        sdtp_server_blueprint.table_server.add_sdtp_table_from_dictionary(stem, table_dict)

        # Also register under the namespaced forms that the elections dashboard uses.
        # The dashboard sends remoteName = "tables/<user>/<stem>.sdml" in POST bodies.
        for ns in ('rick', 'rick.mcgeer@engagelively.com'):
            alias = f'tables/{ns}/{stem}.sdml'
            sdtp_server_blueprint.table_server.add_sdtp_table_from_dictionary(alias, table_dict)

        print(f'Loaded: {stem}')

_load_tables()

if __name__ == '__main__':
    app.run(port=5001, debug=True)
