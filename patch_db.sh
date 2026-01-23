#!/bin/bash
sudo -u postgres psql -d digital_shadow -c "ALTER TYPE importstatus ADD VALUE 'STAGED';"
