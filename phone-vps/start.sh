#!/bin/sh
set -eu
phone_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python "$phone_dir/manage.py" run
