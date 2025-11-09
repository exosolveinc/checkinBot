#!/bin/bash

################################################################################
# Deployment Script with Public Access Check
################################################################################

set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT="exoslackbots"
REGION="us-central1"
FUNCTION_NAME="slackBot"
SERVICE_NAME="slackbot"

MAX_RETRIES=3
RETRY_COUNT=0

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Firebase Deployment Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Function to deploy
deploy() {
    echo -e "${BLUE}Attempt $((RETRY_COUNT + 1)) of $MAX_RETRIES${NC}"
    firebase deploy --only functions,firestore
    return $?
}

# Retry loop
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if deploy; then
        echo ""
        echo -e "${GREEN}✅ Deployment successful!${NC}"
        echo ""
        
        # Get function details
        echo -e "${BLUE}Getting function details...${NC}"
        FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME \
          --region=$REGION \
          --project=$PROJECT \
          --gen2 \
          --format="value(serviceConfig.uri)" 2>/dev/null)
        
        if [ -n "$FUNCTION_URL" ]; then
            echo -e "${GREEN}Function URL: ${FUNCTION_URL}${NC}"
            echo ""
            
            # Test if function is publicly accessible
            echo -e "${BLUE}Testing public access...${NC}"
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FUNCTION_URL" 2>/dev/null)
            
            if [ "$HTTP_CODE" = "403" ]; then
                echo -e "${RED}⚠️  Function is NOT publicly accessible (HTTP 403)${NC}"
                echo ""
                echo -e "${YELLOW}To fix this, run:${NC}"
                echo -e "  ${BLUE}gcloud run services add-iam-policy-binding $SERVICE_NAME \\${NC}"
                echo -e "  ${BLUE}  --region=$REGION \\${NC}"
                echo -e "  ${BLUE}  --member='allUsers' \\${NC}"
                echo -e "  ${BLUE}  --role='roles/run.invoker' \\${NC}"
                echo -e "  ${BLUE}  --project=$PROJECT${NC}"
                echo ""
                echo -e "${YELLOW}If that fails due to org policy, contact your GCP admin.${NC}"
            elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
                echo -e "${GREEN}✅ Function is publicly accessible!${NC}"
            else
                echo -e "${YELLOW}Function returned HTTP $HTTP_CODE${NC}"
            fi
            
            echo ""
            echo -e "${YELLOW}════════════════════════════════${NC}"
            echo -e "${YELLOW}Next Steps: Update Slack App${NC}"
            echo -e "${YELLOW}════════════════════════════════${NC}"
            echo ""
            echo -e "1. Go to: ${BLUE}https://api.slack.com/apps${NC}"
            echo -e "2. Select your app"
            echo -e "3. Update these URLs to: ${GREEN}${FUNCTION_URL}${NC}"
            echo ""
            echo -e "   ${YELLOW}Event Subscriptions:${NC}"
            echo -e "   - Request URL: ${FUNCTION_URL}"
            echo ""
            echo -e "   ${YELLOW}Slash Commands:${NC}"
            echo -e "   - Request URL: ${FUNCTION_URL}"
            echo ""
            echo -e "   ${YELLOW}Interactivity & Shortcuts:${NC}"
            echo -e "   - Request URL: ${FUNCTION_URL}"
            echo ""
            echo -e "4. ${RED}IMPORTANT:${NC} Rotate your Slack tokens (they're exposed!)"
            echo -e "   - Go to OAuth & Permissions → Regenerate token"
            echo -e "   - Go to Basic Information → Regenerate signing secret"
            echo -e "   - Update your .env file with new tokens"
            echo ""
        else
            echo -e "${RED}Could not retrieve function URL${NC}"
        fi
        
        exit 0
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo -e "${YELLOW}⚠️  Deployment failed, retrying in 5 seconds...${NC}"
            sleep 5
        fi
    fi
done

echo ""
echo -e "${RED}================================${NC}"
echo -e "${RED}❌ Deployment failed after $MAX_RETRIES attempts${NC}"
echo -e "${RED}================================${NC}"
echo ""
exit 1