/**
 * googleDocsService.ts - Toolbelt for the Export Feature
 * 
 * RESPONSIBILITY:
 * This service implements the tools required to interface with the Google Workspace APIs,
 * specifically Google Docs. It handles the complex OAuth2 flow and document creation logic,
 * abstracting it away from the main application component.
 */

// NOTE: This Client ID is for a test application and is safe to be public.
// For a production app, you would replace this with your own from Google Cloud Console.
const CLIENT_ID = '108208902598-u59k3k5lil5c4tca5k2f5dbd6h5ssmff.apps.googleusercontent.com';
const DISCOVERY_DOCS = ["https://docs.googleapis.com/$discovery/rest?version=v1"];
const SCOPES = "https://www.googleapis.com/auth/documents";

declare global {
    var gapi: any;
    var google: any;
}

let tokenClient: any = null;

/**
 * Initializes the Google API client and the Google Identity Services token client.
 * This function must be called once when the application loads.
 */
export const initClient = (callback: (tokenClient: any) => void) => {
    gapi.load('client', async () => {
        await gapi.client.init({
            apiKey: process.env.API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
        });

        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // The callback is handled by the promise in handleAuthClick
        });
        callback(tokenClient);
    });
};

/**
 * Prompts the user to sign in and grant permissions.
 */
export const handleAuthClick = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            return reject('Token client not initialized');
        }

        const callback = (resp: any) => {
            if (resp.error) {
                return reject(resp);
            }
            resolve();
        };

        // Overwrites the callback to resolve the promise.
        tokenClient.callback = callback;
        
        // If we already have a token, gapi will use it. If not, it prompts.
        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
             tokenClient.requestAccessToken({ prompt: '' });
        }
    });
};

/**
 * Signs the user out.
 */
export const handleSignoutClick = () => {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken('');
        });
    }
};

/**
 * Creates a new Google Doc with the provided title and content.
 * @returns The URL of the newly created document.
 */
export const createDoc = async (title: string, content: string): Promise<string> => {
    if (!gapi.client.docs) {
        throw new Error("Google Docs API client is not loaded.");
    }
    
    try {
        const createResponse = await gapi.client.docs.documents.create({
            title: title,
        });

        const docId = createResponse.result.documentId;
        
        await gapi.client.docs.documents.batchUpdate({
            documentId: docId,
            resource: {
                requests: [
                    {
                        insertText: {
                            location: {
                                index: 1,
                            },
                            text: content,
                        },
                    },
                ],
            },
        });

        return `https://docs.google.com/document/d/${docId}/edit`;
    } catch (err: any) {
        console.error("Error creating document:", err);
        const errorBody = err.result?.error?.message || 'An unknown error occurred.';
        throw new Error(`Failed to create document: ${errorBody}`);
    }
};
