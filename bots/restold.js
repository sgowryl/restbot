// Copyright (c) Microsoft Corporation. All rights reserved. 
// Licensed under the MIT License.

import { ActivityHandler, MessageFactory, ConsoleTranscriptLogger } from 'botbuilder';
import fetch from 'node-fetch';

async function fetchData() {
    let json = { data: [] }
    try {
        const res = await fetch("http://dummy.restapiexample.com/api/v1/employees")
        try {
            json = await res.json()
        } catch (error) {
            console.log(res, res.headers)
            console.error("let's see ", res.status, res.statusText, error)
        }

    } catch (error) {
        console.error(error)
    }
    return json
}

function filterData(data, input) {
    return data.filter((employee) => employee.employee_name.toLowerCase().includes(input.toLowerCase())

        // todo check for age if input is number employee.employee_age : ""
    );
}

export class RestBot extends ActivityHandler {
    constructor() {
        super();
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            //fetching the data
            const input = context.activity.text;
            const employees = (await fetchData()).data;
            console.log("onMessage", employees?.length)

            let replyText = ''
            if (employees?.length == 0) {
                replyText = `Something wrong with connection. Try again later`;
            } else {
                const filteredData = filterData(employees, input);
                if (filteredData.length == 0) {
                    replyText = `there is no detail found for ${input} among ${employees.length} entries`;
                }
                else {


                    const suggestions = filteredData.map((employee, index) => `
                    
                    id: ${employee.id}
                    name: ${employee.employee_name}
                    salary: ${employee.employee_salary}
                    age: ${employee.employee_age}
                    profile image: ${employee.profile_image}
                    
                    
                    `).join("------------------------- ")
                    replyText = `Found user details: ${suggestions}`;
                }
            }

            await context.sendActivity(MessageFactory.text(replyText, replyText));
            // By calling next() you ensure that the next BotHandler is run. 
            await next();
        });
        //fetching the data
        // const data = [];


        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            console.log("onMembersAdded ", context.activity)
            const welcomeText = 'Hello and welcome to RestBot. Enter the name of the person to be searched. If a match is found, the details of employee will be returned. ' + membersAdded.length;
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

