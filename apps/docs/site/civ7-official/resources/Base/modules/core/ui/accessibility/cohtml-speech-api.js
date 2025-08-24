/*
This file is part of Cohtml, Gameface and Prysm - modern user interface technologies.

Copyright (c) 2012-2024 Coherent Labs AD and/or its licensors. All
rights reserved in all media.

The coded instructions, statements, computer programs, and/or related
material (collectively the "Data") in these files contain confidential
and unpublished information proprietary Coherent Labs and/or its
licensors, which is protected by United States of America federal
copyright law and by international treaties.

This software or source code is supplied under the terms of a license
agreement and nondisclosure agreement with Coherent Labs AD and may
not be copied, disclosed, or exploited except in accordance with the
terms of that agreement. The Data may not be disclosed or distributed to
third parties, in whole or in part, without the prior written consent of
Coherent Labs AD.

COHERENT LABS MAKES NO REPRESENTATION ABOUT THE SUITABILITY OF THIS
SOURCE CODE FOR ANY PURPOSE. THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT
HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER, ITS AFFILIATES,
PARENT COMPANIES, LICENSORS, SUPPLIERS, OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
ANY WAY OUT OF THE USE OR PERFORMANCE OF THIS SOFTWARE OR SOURCE CODE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
'use strict';

/**
 * Supported languages
 * @warning make sure to match this with C++ TTS definition
 */
const COHTML_SPEECH_API_LANGS = {
    EN: 0,
}

/**
 * Represents a speech request.
 * Only one speech request is played at a time.
 * @class CohtmlSpeechRequest
 */
class CohtmlSpeechRequest {
    static INVALID_REQUEST_ID = -1;
    static NextRequestId = 0;

    /**
     * Creates an instance of CohtmlSpeechRequest.
     * @param {string} text
     * @param {number} channelId
     * @param {number} volume from 1 to 100
     * @param {number} speed from 1 to 10
     * @param {COHTML_SPEECH_API_LANGS} lang
     * @memberof CohtmlSpeechRequest
     */
    constructor(text, channelId, volume, speed, lang) {
        this.id = CohtmlSpeechRequest.NextRequestId++;
        this.text = text;
        this.channelId = channelId;
        this.volume = volume;
        this.speed = speed;
        this.lang = lang;
    }
}

/**
 * A logical channel that holds a requests queue.
 * Channels with higher priorities should be scheduled first.
 * @class CohtmlSpeechChannel
 */
class CohtmlSpeechChannel {
    static INVALID_CHANNEL_ID = -1;
    static PRIORITIES = {
        LOW: 0,
        MEDIUM: 1,
        HIGH: 2,
        URGENT: 3
    };

    constructor(priority) {
        this._priority = priority;
        this._requests = [];
    }

    get priority() {
        return this._priority;
    }

    get requests() {
        return this._requests;
    }

    get requestsCount() {
        return this._requests.length;
    }

    hasRequest(requestId) {
        return this._requests.find(v => v.id == requestId) !== undefined;
    }

    /**
     * Pops next request from the channel
     * @return {CohtmlSpeechRequest}
     * @memberof CohtmlSpeechChannel
     */
    popNextRequest() {
        if (this.requests.length > 0) {
            const request = this._requests[0];
            this._requests.shift();
            return request;
        }

        return null;
    }

    /**
     * Adds a request to the queue
     * @param {CohtmlSpeechRequest} request
     * @memberof CohtmlSpeechChannel
     */
    addRequest(request) {
        this._requests.push(request);
    }

    /**
     * Discards the request
     * @param {number} requestId
     * @return {bool} if the request was found and removed or not
     * @memberof CohtmlSpeechChannel
     */
    discardRequest(requestId) {
        const foundIdx = this._requests.findIndex(v => v.id == requestId);
        if (foundIdx != -1) {
            this._requests.splice(foundIdx, 1);
            return true;
        }
        return false;
    }

    /**
     * Discards all the requests in the channel
     * @memberof CohtmlSpeechChannel
     */
    discardAll() {
        this._requests = [];
    }
}

/**
 * Represents the API for speech api.
 * Manages multiple channels.
 * A single request and single channel at a time is spoken. It's not possible to mix sound from multiple channels.
 * @class CohtmlSpeechAPIImpl
 */
class CohtmlSpeechAPIImpl {
    /**
     * Used for Cohtml binding
     * @static
     * @memberof CohtmlSpeechAPIImpl
     */
    static SPEECH_EVENT_NAMES = {
        SPEAK: 'speechapi.speak',
        CANCEL: 'speechapi.cancel',
        IS_SPEAKING: 'speechapi.isSpeaking',
    };

    constructor() {
        this._channels = [
            new CohtmlSpeechChannel(CohtmlSpeechChannel.PRIORITIES.LOW),
            new CohtmlSpeechChannel(CohtmlSpeechChannel.PRIORITIES.MEDIUM),
            new CohtmlSpeechChannel(CohtmlSpeechChannel.PRIORITIES.HIGH),
            new CohtmlSpeechChannel(CohtmlSpeechChannel.PRIORITIES.URGENT),
        ];

        // In case we support more than one channel per priority in the future.
        this._prioritizedChannelIds = Object.keys(this._channels).sort((aId, bId) => {
            return this._channels[bId].priority - this._channels[aId].priority;
        });

        // indicates if the current request is still synthesizing *or* playing.
        this._isSpeaking = false;
        this._currentCohtmlSpeechRequest = null;
        this._running = false;
        this._updateOnEachFrameBinded = this._updateOnEachFrame.bind(this);
        this._updateOnIntervalBinded = this._updateOnInterval.bind(this)
    }

    /**
     * @param {CohtmlSpeechChannel.PRIORITIES} priority
     * @return {number} the id of the first channel with the priority
     * @memberof CohtmlSpeechAPIImpl
     */
    getChannelId(priority) {
        if (this._channels.length > priority && this._channels[priority] instanceof CohtmlSpeechChannel) {
            return priority;
        }

        return CohtmlSpeechChannel.INVALID_CHANNEL_ID;
    }

    /**
     * Enqueues a new speech request to the channel queue.
     * @note This does not notify the C++ API about new request.
     * @param {String} text Text to speak
     * @param {number} channelId The channel request should be be added to
     * @param {COHTML_SPEECH_API_LANGS} Language. Currently only English is supported
     * @param {number} volume Volume of the played audio for the new request. From 1 to 100.
     * @param {number} rate Speed of the played audio. From 1 to 10. Negative rate is not supported.
     * @return {number} Id of the new request
     * @memberof CohtmlSpeechAPIImpl
     */
    addSpeechRequest(text, channelId = 0, lang = COHTML_SPEECH_API_LANGS.EN, volume = 100, rate = 1) {
        //BEGIN FIRAXIS CHANGE - This references an option coherent module we are not using
        // text = CohtmlAriaUtils.normalizeWhiteSpaces(text);
        //END FIRAXIS CHANGE
        const request = new CohtmlSpeechRequest(text, channelId, volume, rate, lang);

        this._channels[channelId].addRequest(request);
        return request.id;
    }

    /**
     * Checks if request is currently speaking
     * @param {number} requestId
     * @return {boolean} 
     * @memberof CohtmlSpeechAPIImpl
     */
    isSpeakingRequest(requestId) {
        return this._currentCohtmlSpeechRequest && this._currentCohtmlSpeechRequest.id == requestId;
    }

    /**
     * Checks if request is currently speaking or scheduled for speaking
     * @param {number} requestId
     * @return {boolean} 
     * @memberof CohtmlSpeechAPIImpl
     */
    isScheduledForSpeakingRequest(requestId) {
        if (this.isSpeakingRequest(requestId)) {
            return true;
        }

        for (const channel of this._channels) {
            if (channel.hasRequest(requestId)) {
                return true;
            }
        }
    }

    /**
     * Discards a specific request from a specific channel
     * @note This does not notify the C++ API about cancelled request because C++ API may not know about it yet.
     * @param {number} requestId the request to be discarded
     * @param {number} channelId the channel where the request was added
     * @return {boolean} if the request was found and discarded
     * @memberof CohtmlSpeechAPIImpl
     */
    discardRequest(requestId, channelId = 0) {
        if (this._currentCohtmlSpeechRequest && this._currentCohtmlSpeechRequest.id == requestId) {
            this._currentCohtmlSpeechRequest = null;
            return true;
        }

        return this._channels[channelId].discardRequest(requestId);
    }

    /**
     * Discards all requests in a specific channel
     * @param {number} channelId the channel to be discarded
     * @memberof CohtmlSpeechAPIImpl
     */
    discardChannel(channelId = 0) {
        this._channels[channelId].discardAll();

        if (this._currentCohtmlSpeechRequest && this._currentCohtmlSpeechRequest.channelId == channelId) {
            this._currentCohtmlSpeechRequest = null;
        }
    }

    /**
     * Discards all requests from all channels
     * @memberof CohtmlSpeechAPIImpl
     */
    discardAll() {
        for (let channelId of this._channels) {
            this.discardChannel(channelId);
        }
    }

    /**
     * Aborts the currently speaking request.
     * @memberof CohtmlSpeechAPIImpl
     */
    abortCurrentRequest() {
        this._currentCohtmlSpeechRequest = null;
        this._cancelSpeaking();
    }

    /**
     * Runs the Speech API advancing.
     * @param {number} [interval=-1] Optional, will update on a given interval between updates, or on each frame if -1.
     * @memberof CohtmlSpeechAPIImpl
     */
    run(interval = -1) {
        if (this._running) {
            return;
        }

        this._running = true;
        if (interval > 0) {
            this._updateOnInterval(interval);
        } else {
            this._updateOnEachFrame();
        }
    }

    /**
     * Pauses the advancing
     * @memberof CohtmlSpeechAPIImpl
     */
    pause() {
        this._running = false;
    }

    /**
     * Cancels the current speak request playing or synthesizing
     * @note it's async, there is not guarantee it's canceled even after Promise resolving
     * @memberof CohtmlSpeechAPIImpl
     */
    _cancelSpeaking() {
        // async, no guarantee it's canceled.
        engine.call(CohtmlSpeechAPIImpl.SPEECH_EVENT_NAMES.CANCEL);
    }

    /**
     * Updates local state if the TTS module is currently playing/synthesizing some task
     * @return {Promise}
     * @memberof CohtmlSpeechAPIImpl
     */
    _checkIsSpeaking(currentRequestOnCall) {
        return engine.call(CohtmlSpeechAPIImpl.SPEECH_EVENT_NAMES.IS_SPEAKING).then(v => {
            if (currentRequestOnCall == this._currentCohtmlSpeechRequest) {
                this._isSpeaking = v;
                if (!this._isSpeaking) {
                    this._currentCohtmlSpeechRequest = null;
                }
            }
        });
    }

    _getNextPrioritizedRequest() {
        // Schedule the next request
        for (const channelId of this._prioritizedChannelIds) {
            let request = this._channels[channelId].popNextRequest();
            if (request) {
                return request;
            }
        }

        return null;
    }

    /**
     * Advances the current state of this API.
     * @note use this only for custom update handling, use `run` otherwise
     * @return {Promise}
     * @memberof CohtmlSpeechAPIImpl
     */
    async _update() {
        if (this._isSpeaking && this._currentCohtmlSpeechRequest) {
            // We're processing some request, check if it's still true
            await this._checkIsSpeaking(this._currentCohtmlSpeechRequest);
            return;
        }

        this._currentCohtmlSpeechRequest = this._getNextPrioritizedRequest();
        if (this._currentCohtmlSpeechRequest) {
            this._notifyAboutRequest(this._currentCohtmlSpeechRequest);
            // No need to wait for async status update, we're guaranteed the new request is added.
            this._isSpeaking = true;
        }
    }

    _updateOnEachFrame() {
        if (!this._running) {
            return;
        }
        // Wait for async update promise to make sure we do not spam our bindings with unnecessary calls.
        this._update().then(() => {
            requestAnimationFrame(this._updateOnEachFrameBinded);
        });
    }

    _updateOnInterval(interval) {
        if (!this._running) {
            return;
        }
        // Wait for async update promise to make sure we do not spam our bindings with unnecessary calls.
        this._update().then(() => {
            setTimeout(this._updateOnIntervalBinded, interval);
        });
    }

    /**
     * Notifies TTS module about new request.
     * @param {CohtmlSpeechRequest} request
     * @return {Promise}
     * @memberof CohtmlSpeechAPIImpl
     */
    _notifyAboutRequest(request) {
        return engine.call(CohtmlSpeechAPIImpl.SPEECH_EVENT_NAMES.SPEAK,
            request.text,
            request.volume, request.speed,
            request.lang);
    }
}

/**
 * Global speech api instance
 * @type {CohtmlSpeechAPIImpl}
 */
const CohtmlSpeechAPI = new CohtmlSpeechAPIImpl();

// Run it.
window.addEventListener("load", () => {
    CohtmlSpeechAPI.run();
});
