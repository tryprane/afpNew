// src/providers/samarthPortal.ts
import puppeteer, { Browser, Page } from 'puppeteer';
import { elizaLogger } from "@elizaos/core";
import path from 'path';

interface FeeInfo {
  serialNo: string;
  feeId: string;
  enrollmentNo: string;
  course: string;
  semester: string;
  session: string;
  status: string;
}
interface TableRow {
  [key: string]: string;
}
interface TableData {
  headers: string[];
  rows: TableRow[];
}

interface PaymentResult {
  screenshotPath: string;
  feeInfo?: FeeInfo;
}

export class SamarthPortalService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isLoggedIn: boolean = false;
  private username: string = '';
  private password: string = '';

  constructor(username?: string, password?: string) {
    if (username) this.username = username;
    if (password) this.password = password;
  }

  async initialize(): Promise<boolean> {
    try {
      this.browser = await puppeteer.launch({ 
        headless: false
      });
      this.page = await this.browser.newPage();
      await this.page.setViewport({
        width: 1366,  // Standard desktop width
        height: 768,  // Standard desktop height
        deviceScaleFactor: 1,
      });
      elizaLogger.info("Browser initialized for Samarth Portal");
      return true;
    } catch (error) {
      elizaLogger.error("Failed to initialize browser", error);
      return false;
    }
  }

  async login(username?: string, password?: string): Promise<boolean> {
    if (!this.browser || !this.page) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      if (username) this.username = username;
      if (password) this.password = password;
      
      if (!this.username || !this.password || !this.page) {
        elizaLogger.error("Username or password not provided, or page not initialized");
        return false;
      }

      await this.page.goto('https://ggv.samarth.edu.in/index.php/site/login');
      await this.page.waitForSelector('#login-form');
      
      await this.page.type('#loginform-username', this.username);
      await this.page.type('#loginform-password', this.password);
      
      await this.page.click('button[name="login-button"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });

      const currentUrl = this.page.url();
      
      if (currentUrl.includes('/site/login') || currentUrl.includes('/error')) {
        return false
      }
      
      this.isLoggedIn = true;
      elizaLogger.info("Successfully logged in to Samarth portal");
      return true;
    } catch (error) {
      elizaLogger.error("Error during login", error);
      return false;
    }
  }

  async courseSelection(): Promise<PaymentResult> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    // Navigate to fee history page
    await this.page.goto("https://ggv.samarth.edu.in/index.php/vidhyarthi/re-registration/history");
    
    // Wait for the table to load
    await this.page.waitForSelector('tbody tr');
    
    // Get the first row's fee information
    
  
    // Click the print button of the first row
    await this.page.click('tbody tr:first-child .btn-success');
    
    // Wait for the fee details card to load
    await this.page.waitForSelector('.card');
    
    // Make sure the element is fully visible by scrolling to it
    await this.page.$eval('.card', (card: Element) => {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    
    // Wait a moment for scrolling to complete
  
    
    // Get the bounding box of the card with some padding
    const boundingBox = await this.page.evaluate(() => {
      const card = document.querySelector('.card');
      if (!card) return null;
      
      const rect = card.getBoundingClientRect();
      // Add padding in pixels
      
      return {
        x: Math.max(0, rect.left),
        y: Math.max(0, rect.top),
        width: rect.width,
        height: rect.height
      };
    });
    
    if (!boundingBox) throw new Error('Could not get card dimensions');
    
    // Take screenshot of the card with padding
    const screenshotPath = path.join(process.cwd(), 'fee-details.png');
    await this.page.screenshot({ 
      path: screenshotPath,
      clip: boundingBox
    });
  
    return { screenshotPath };
  }

  async getStudentProfile(): Promise<any> {
    if (!this.isLoggedIn || !this.page) {
      elizaLogger.error("Not logged in or page not initialized. Please login first.");
      return null;
    }

    try {
      await this.page.goto('https://ggv.samarth.edu.in/index.php/vidhyarthi/profile/index');
      
      const studentInfo = await this.page.evaluate(() => {
        const tableRows = document.querySelectorAll('.card-body .table-light tbody tr');
        const details: { [key: string]: string } = {};
        
        tableRows.forEach(row => {
          const headers = row.querySelectorAll('th');
          const cells = row.querySelectorAll('td');
          
          headers.forEach((header, index) => {
            if (header && cells[index]) {
              const key = header.textContent?.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '') || '';
              const value = cells[index].textContent?.trim() || '';
              
              if (key && value) {
                details[key] = value;
              }
            }
          });
        });
        
        return details;
      });
      
      return studentInfo;
    } catch (error) {
      elizaLogger.error("Error fetching student profile", error);
      return null;
    }
  }



  async fetchMyPayments(): Promise<PaymentResult> {
    if (!this.isLoggedIn) {
      elizaLogger.error("Not logged in. Please login first.");
      throw new Error("Not logged in");
    }

    try {
      // Navigate to fee history page
      await this.page!.goto('https://ggv.samarth.edu.in/index.php/pgintegration/payment/student', {
        timeout: 60000,
        waitUntil: 'networkidle2'
      });
      
      // Wait for the table to load
      await this.page!.waitForSelector('tbody tr');
      
      // Make sure the element is fully visible by scrolling to it
      await this.page!.$eval('.card', (card: Element) => {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      
      // Get the bounding box of the card with some padding
      const boundingBox = await this.page!.evaluate(() => {
        const card = document.querySelector('tbody');
        if (!card) return null;
        
        const rect = card.getBoundingClientRect();
        return {
          x: Math.max(0, rect.left),
          y: Math.max(0, rect.top),
          width: rect.width,
          height: rect.height
        };
      });
      
      if (!boundingBox) throw new Error('Could not get card dimensions');
      
      // Take screenshot of the card with padding
      const screenshotPath = path.join(process.cwd(), 'my-payments.png');
      elizaLogger.info(screenshotPath)
      await this.page!.screenshot({ 
        path: screenshotPath,
        clip: boundingBox
      });

      return { screenshotPath };
    } catch (error) {
      elizaLogger.error("Error fetching payments", error);
      throw error;
    }
  }

  async fetchFeeDetails(): Promise<PaymentResult> {
    if (!this.isLoggedIn || !this.page) {
      elizaLogger.error("Not logged in or page not initialized");
      throw new Error("Not logged in or page not initialized");
    }

    try {
      // Navigate to fee history page
      await this.page.goto('https://ggv.samarth.edu.in/index.php/vidhyarthi/fee/history');
      
      // Wait for the table to load
      await this.page.waitForSelector('tbody tr');
      
      // Get the first row's fee information
      const feeInfo = await this.page.evaluate(() => {
        const firstRow = document.querySelector('tbody tr');
        if (!firstRow) throw new Error('No fee records found');
        
        const cells = firstRow.querySelectorAll('td');
        return {
          serialNo: cells[0].textContent?.trim() || '',
          feeId: cells[1].textContent?.trim() || '',
          enrollmentNo: cells[2].textContent?.trim() || '',
          course: cells[3].textContent?.trim() || '',
          semester: cells[4].textContent?.trim() || '',
          session: cells[5].textContent?.trim() || '',
          status: cells[6].textContent?.trim() || '',
          printLink: cells[7].querySelector('a')?.getAttribute('href') || ''
        };
      });
  
      // Click the print button of the first row
      await this.page.click('tbody tr:first-child .btn-success');
      
      // Wait for the fee details card to load
      await this.page.waitForSelector('.card');
      
      // Make sure the element is fully visible by scrolling to it
      await this.page.$eval('.card', (card: Element) => {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      
      // Get the bounding box of the card with some padding
      const boundingBox = await this.page.evaluate(() => {
        const card = document.querySelector('.card');
        if (!card) return null;
        
        const rect = card.getBoundingClientRect();
        return {
          x: Math.max(0, rect.left),
          y: Math.max(0, rect.top),
          width: rect.width,
          height: rect.height
        };
      });
      
      if (!boundingBox) throw new Error('Could not get card dimensions');
      
      // Take screenshot of the card with padding
      const screenshotPath = path.join(process.cwd(), 'fee-details.png');
      await this.page.screenshot({ 
        path: screenshotPath,
        clip: boundingBox
      });
  
      return { feeInfo, screenshotPath };
    } catch (error) {
      elizaLogger.error("Error fetching fee details", error);
      throw error;
    }
  }

  async fetchContent(pageURL: string): Promise<string> {
    try {
      if (!this.page) {
        throw new Error("Page not initialized");
      }
      // Navigate to the specified URL and wait until network is idle
      await this.page.goto(pageURL, { waitUntil: "networkidle2" });

      // Wait for the table to be visible on the page
      await this.page.waitForSelector("table.table", { timeout: 10000 });

      // Extract the table data using page.evaluate
      const tableData: TableData[] = await this.page.evaluate(() => {
        const tables = document.querySelectorAll("table.table");
        let extractedData: Array<{
          headers: string[];
          rows: Array<Record<string, string>>;
        }> = [];

        tables.forEach((table) => {
          // Get table headers with proper HTMLElement casting
          const headers = Array.from(table.querySelectorAll("thead tr td")).map(
            (th) => {
              return (th as HTMLTableCellElement).textContent?.trim() || "";
            }
          );

          // Get table rows with proper HTMLElement casting
          const rows = Array.from(table.querySelectorAll("tbody tr")).map(
            (row) => {
              const rowData = Array.from(row.querySelectorAll("td")).map(
                (cell) => {
                  return (
                    (cell as HTMLTableCellElement).textContent?.trim() || ""
                  );
                }
              );

              // Create an object mapping headers to cell values
              const rowObject: Record<string, string> = {};
              headers.forEach((header, index) => {
                rowObject[header] = rowData[index] || "";
              });

              return rowObject;
            }
          );

          extractedData.push({
            headers: headers,
            rows: rows,
          });
        });

        return extractedData;
      });

      // Convert the extracted data to a string
      return JSON.stringify(tableData, null, 2);
    } catch (error) {
      console.error(
        `Error fetching content from ${pageURL}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw new Error(
        `Failed to fetch content: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async examHistory( ) {
    try {
      const url =
        "https://ggv.samarth.edu.in/index.php/examstudent/information/index";

      if (!this.page) {
        throw new Error("Page not Initialized");
      }

      await this.page.goto(url, { waitUntil: "networkidle2" });

      await this.page.waitForSelector(".dashboard-widget", { timeout: 10000 });

      const examUrl = await this.page.evaluate(() => {
        const clickHereButton = document.querySelector(
          ".dashboard-widget .card-body .btn"
        );

        // Return the href attribute if the button exists, otherwise null
        return clickHereButton ? clickHereButton.getAttribute("href") : null;
      });

      if (typeof examUrl !== "string") {
        throw new Error("examUrl must be a string");
      }

      const upUrl = 'https://ggv.samarth.edu.in'+ examUrl;

      const examHistory = await this.fetchContent(upUrl);

      return examHistory
    } catch (error) {
      elizaLogger.error("Error on Extracting the URL");
    }
  }



  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
      elizaLogger.info("Browser closed");
    }
  }
}

export const initializeSamarthPortal = (
  
  username?: string,
  password?: string
): SamarthPortalService | null => {
  try {
    const samarthService = new SamarthPortalService(username, password);
    return samarthService;
  } catch (error) {
    elizaLogger.error("Failed to initialize Samarth Portal service", error);
    return null;
  }
};