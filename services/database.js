// import { Response } from 'express';
// import mongoose from 'mongoose';
var mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

/**
 * aggregate
 * @param whereCondition 
 * @param modelObj 
 */
const aggregate = async (whereCondition, modelObj) => {
    return new Promise((resolve, reject) => {
        modelObj.aggregate(whereCondition).then((response) => {
            resolve(response);
        }).catch((error) => {
            reject(error);
        });
    });
}

/**
 * aggregateWithGroupBy
 * @param whereCondition 
 * @param modelObj 
 * @param group 
 */
const aggregateWithGroupBy = async (whereCondition, modelObj, group) => {
    return new Promise((resolve, reject) => {
        modelObj.aggregate([
            {
                $match: whereCondition
            },
            {
                $group: group
            },

        ]).then((response) => {
            resolve(response);
        }).catch((error) => {
            reject(error);
        });
    });
}

/**
 *findOne
    * @param params
    * @param modelObj
    * @param populateKey
    */
const findOne = async (
    params,
    modelObj,
    populateKey ='',
    selectKeys = {},
    sortBy = { _id: 1 }
)=> {
    return new Promise(async (resolve, reject) => {
        if (typeof populateKey !== 'undefined' && populateKey.trim() !== '') {
            await modelObj
                .findOne(params)
                .select(selectKeys)
                .populate(populateKey)
                .sort(sortBy)
                .then((data) => {
                    resolve(data);
                })
                .catch((error) => {
                    reject(error);
                });
        } else {
            await modelObj
                .findOne(params)
                .select(selectKeys)
                .sort(sortBy)
                .then((data) => {
                    resolve(data);
                })
                .catch((error) => {
                    reject(error);
                });
        }
    });
}

/**
 * findRecord
 * @param params 
 * @param modelObj 
 */
const findRecord = async (
    params,
    modelObj) => {
    return new Promise(async (resolve, reject) => {
        await modelObj
            .findOne(params)
            .then((data) => {
                resolve(data);
            })
            .catch((error) => {
                reject(error);
            });
    });
}

const updateAll = async (
    filterObj,
    updateObj,
    modelObj
) => {
    return new Promise(async (resolve, reject) => {
        await modelObj
            .updateMany(filterObj, updateObj)
            .then((data) => {
                resolve(data);
            })
            .catch((error) => {
                reject(error);
            });
    });
}

const upsert = (filterObj, updateObj, modelObj) => {
    return new Promise((resolve, reject) => {
        modelObj
            .findOneAndUpdate(filterObj, updateObj, {
                upsert: true,
                new: true,
                runValidators: true
            })
            .then((data) => {
                resolve(data);
            })
            .catch((error) => {
                reject(error);
            });
    });
}

const create = async (
    insertObj,
    modelObj
) => {
    return new Promise(async (resolve, reject) => {
        await modelObj
            .create(insertObj)
            .then((data) => {
                resolve(data);
            })
            .catch((error) => {
                reject(error);
            });
    });
}
module.exports = { updateAll, findRecord, findOne, aggregateWithGroupBy, aggregate, create, upsert }