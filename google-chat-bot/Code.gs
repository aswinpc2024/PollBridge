/**
 * Google Chat Bot - Swiggy Instamart Group Order Poll
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Go to script.google.com and create a new project.
 * 2. Paste this entire file into the Code.gs editor.
 * 3. Replace SUPABASE_URL and SUPABASE_ANON_KEY below with your project values.
 * 4. Deploy as a Google Chat App:
 *    - Click Deploy > New Deployment > Google Chat App
 *    - Set the description and version
 *    - Copy the deployment ID
 * 5. In Google Cloud Console > APIs & Services > Enabled APIs, enable Google Chat API.
 * 6. Configure the Chat Bot in Google Chat API settings:
 *    - Set the App name, avatar, and description
 *    - Under "Connection settings", select "Apps Script project"
 *    - Paste the deployment ID
 * 7. In Google Workspace Admin, enable the Chat App for your domain.
 */

// ─── Configuration ───────────────────────────────────────────────────────────
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// ─── Mock Data (fallback when Supabase is not configured) ────────────────────
const MOCK_CATEGORIES = {
  Snacks: [
    { name: 'Lays Classic Chips', sku: 'SKU-SNACK-001', price: 20 },
    { name: 'Kurkure Masala', sku: 'SKU-SNACK-002', price: 20 },
    { name: 'Haldiram Bhujia', sku: 'SKU-SNACK-003', price: 55 },
    { name: 'Maggi Noodles', sku: 'SKU-SNACK-004', price: 14 },
    { name: 'Dark Fantasy Cookies', sku: 'SKU-SNACK-005', price: 30 },
  ],
  Beverages: [
    { name: 'Coca-Cola 750ml', sku: 'SKU-BEV-001', price: 40 },
    { name: 'Paper Boat Aam Panna', sku: 'SKU-BEV-002', price: 30 },
    { name: 'Bisleri Water 1L', sku: 'SKU-BEV-003', price: 20 },
    { name: 'Real Mango Juice 1L', sku: 'SKU-BEV-004', price: 99 },
    { name: 'Red Bull 250ml', sku: 'SKU-BEV-005', price: 115 },
  ],
  Household: [
    { name: 'Vim Dishwash Gel', sku: 'SKU-HH-001', price: 99 },
    { name: 'Surf Excel Matic', sku: 'SKU-HH-002', price: 199 },
    { name: 'Harpic Toilet Cleaner', sku: 'SKU-HH-003', price: 79 },
    { name: 'Colin Glass Cleaner', sku: 'SKU-HH-004', price: 110 },
    { name: 'Scotch Brite Scrub Pad', sku: 'SKU-HH-005', price: 25 },
  ],
};

// ─── In-memory poll state (per user session) ─────────────────────────────────
// Key: thread name, Value: { category, votes: { userName: [sku, ...] } }
const pollState = {};

// ─── Event Handlers ─────────────────────────────────────────────────────────

/**
 * Called when a user adds the bot to a space or sends a message.
 */
function onMessage(event) {
  const message = event.message.argumentText
    ? event.message.argumentText.trim()
    : '';
  const userName = event.user.displayName || 'Anonymous';
  const threadName = event.space.name;

  // Initialize poll state for this thread
  if (!pollState[threadName]) {
    pollState[threadName] = { category: null, votes: {} };
  }

  // Command routing
  if (message === '' || message === 'help') {
    return { text: 'Type `order` to start a group order poll!' };
  }

  if (message === 'order' || message === 'start') {
    return buildCategoryPicker();
  }

  if (message.startsWith('pick ')) {
    const category = message.replace('pick ', '').trim();
    return handleCategoryPick(threadName, category);
  }

  if (message.startsWith('vote ')) {
    const sku = message.replace('vote ', '').trim();
    return handleVote(threadName, userName, sku);
  }

  if (message === 'finalize') {
    return handleFinalize(threadName);
  }

  if (message === 'results') {
    return handleResults(threadName);
  }

  return { text: 'Unknown command. Type `help` for available commands.' };
}

/**
 * Called when a user clicks an interactive card button.
 */
function onCardClick(event) {
  const action = event.action.actionMethodName;
  const threadName = event.space.name;
  const userName = event.user.displayName || 'Anonymous';

  if (!pollState[threadName]) {
    pollState[threadName] = { category: null, votes: {} };
  }

  switch (action) {
    case 'pickCategory': {
      const category = event.action.parameters.find(
        (p) => p.key === 'category'
      ).value;
      return handleCategoryPick(threadName, category);
    }
    case 'toggleItem': {
      const sku = event.action.parameters.find(
        (p) => p.key === 'sku'
      ).value;
      return handleVote(threadName, userName, sku);
    }
    case 'finalizePoll': {
      return handleFinalize(threadName);
    }
    default:
      return { text: 'Unknown action.' };
  }
}

// ─── Card Builders ──────────────────────────────────────────────────────────

function buildCategoryPicker() {
  const categories = Object.keys(MOCK_CATEGORIES);

  const buttons = categories.map((cat) => ({
    textButton: {
      text: cat,
      onClick: {
        action: {
          actionMethodName: 'pickCategory',
          parameters: [{ key: 'category', value: cat }],
        },
      },
    },
  }));

  return {
    cards: [
      {
        sections: [
          {
            header: 'Choose a Category',
            widgets: [
              {
                buttons: buttons,
              },
            ],
          },
        ],
      },
    ],
  };
}

function buildItemCard(threadName, category) {
  const items = getItemsForCategory(category);
  pollState[threadName].category = category;

  const checkboxes = items.map((item) => ({
    label: `${item.name}  -  Rs.${item.price}  (SKU: ${item.sku})`,
    value: item.sku,
    selected: false,
    onChangeAction: {
      actionMethodName: 'toggleItem',
      parameters: [{ key: 'sku', value: item.sku }],
    },
  }));

  return {
    cards: [
      {
        sections: [
          {
            header: `${category} - Select Items`,
            widgets: [
              {
                keyValue: {
                  topLabel: 'Category',
                  content: category,
                },
              },
              {
                checkboxes: {
                  items: checkboxes,
                },
              },
              {
                buttons: [
                  {
                    textButton: {
                      text: 'FINALIZE POLL',
                      onClick: {
                        action: {
                          actionMethodName: 'finalizePoll',
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function buildResultsCard(threadName, pollData) {
  const items = getItemsForCategory(pollState[threadName].category);
  const lines = pollData.map((entry) => {
    const item = items.find((i) => i.sku === entry.sku);
    const name = item ? item.name : entry.sku;
    return `  ${name}: ${entry.qty} vote(s)`;
  });

  const url = buildSwiggyUrl(pollData);

  return {
    cards: [
      {
        sections: [
          {
            header: 'Poll Results',
            widgets: [
              {
                textParagraph: {
                  text: lines.join('\n'),
                },
              },
              {
                buttons: [
                  {
                    textButton: {
                      text: 'OPEN IN SWIGGY',
                      onClick: {
                        openLink: {
                          url: url,
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

// ─── Handlers ───────────────────────────────────────────────────────────────

function handleCategoryPick(threadName, category) {
  const categories = Object.keys(MOCK_CATEGORIES);
  if (!categories.includes(category)) {
    return {
      text: `Unknown category "${category}". Available: ${categories.join(', ')}`,
    };
  }
  return buildItemCard(threadName, category);
}

function handleVote(threadName, userName, sku) {
  const state = pollState[threadName];
  if (!state.votes[userName]) {
    state.votes[userName] = [];
  }

  const idx = state.votes[userName].indexOf(sku);
  if (idx >= 0) {
    state.votes[userName].splice(idx, 1);
  } else {
    state.votes[userName].push(sku);
  }

  const category = state.category || 'Snacks';
  return buildItemCard(threadName, category);
}

function handleFinalize(threadName) {
  const state = pollState[threadName];
  const tally = {};

  Object.values(state.votes).forEach((userVotes) => {
    userVotes.forEach((sku) => {
      tally[sku] = (tally[sku] || 0) + 1;
    });
  });

  const pollData = Object.entries(tally)
    .map(([sku, qty]) => ({ sku, qty }))
    .filter((entry) => entry.qty > 0);

  if (pollData.length === 0) {
    return { text: 'No votes were cast. The poll is empty.' };
  }

  // Persist to Supabase if configured
  if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    persistPollToSupabase(threadName, pollData);
  }

  return buildResultsCard(threadName, pollData);
}

function handleResults(threadName) {
  return handleFinalize(threadName);
}

// ─── URL Builder ────────────────────────────────────────────────────────────

function buildSwiggyUrl(pollData) {
  const encoded = encodeURIComponent(JSON.stringify(pollData));
  return `https://swiggy.com/instamart?poll_data=${encoded}`;
}

// ─── Data Access ─────────────────────────────────────────────────────────────

function getItemsForCategory(category) {
  // Try Supabase first, fall back to mock data
  if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    try {
      const response = UrlFetchApp.fetch(
        `${SUPABASE_URL}/rest/v1/items?select=name,sku,price&categories(name=eq.${category})`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          muteHttpExceptions: true,
        }
      );
      if (response.getResponseCode() === 200) {
        return JSON.parse(response.getContentText());
      }
    } catch (e) {
      // Fall through to mock data
    }
  }
  return MOCK_CATEGORIES[category] || [];
}

// ─── Supabase Persistence ───────────────────────────────────────────────────

function persistPollToSupabase(threadName, pollData) {
  try {
    // Create poll record
    const pollResponse = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/polls`,
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: 'return=representation',
        },
        payload: JSON.stringify({
          title: 'Group Order',
          created_by: threadName,
          status: 'finalized',
          poll_url: buildSwiggyUrl(pollData),
          finalized_at: new Date().toISOString(),
        }),
        muteHttpExceptions: true,
      }
    );

    if (pollResponse.getResponseCode() !== 201) return;

    const poll = JSON.parse(pollResponse.getContentText());

    // Insert votes
    const voteRecords = pollData.map((entry) => ({
      poll_id: poll.id,
      item_id: entry.sku,
      user_name: 'group',
      quantity: entry.qty,
    }));

    UrlFetchApp.fetch(`${SUPABASE_URL}/rest/v1/poll_votes`, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      payload: JSON.stringify(voteRecords),
      muteHttpExceptions: true,
    });
  } catch (e) {
    // Silent fail - poll data still returned to user
  }
}
