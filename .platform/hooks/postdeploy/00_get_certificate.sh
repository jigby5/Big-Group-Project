#!/usr/bin/env bash
# Place in .platform/hooks/postdeploy directory
sudo certbot -n -d gregbacon.us-east-2.elasticbeanstalk.com --nginx --agree-tos --email johnhigby5@gmail.com